import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContextService } from '../tenancy/tenant-context.service';

export interface TenantTransactionOptions {
  /** Tenant explícito para fluxos sem token, como login e cadastro. */
  tenantId?: string;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

type Executor = { $executeRaw: PrismaClient['$executeRaw'] };
type ModelDelegate = Record<string, (args: unknown) => Promise<unknown>>;

// Informa ao PostgreSQL o tenant da transação; as políticas de Row-Level Security
// (migração row_level_security) só liberam as linhas desse tenant. O terceiro
// argumento TRUE limita o valor à transação corrente, então ele nunca vaza para
// outra requisição que reutilize a mesma conexão do pool.
function setTenant(client: Executor, tenantId: string) {
  return client.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  /**
   * Transação interativa já com o tenant definido no banco. Use para operações
   * que precisam de várias consultas atômicas ou que acontecem antes de existir
   * um token (login e cadastro).
   */
  declare tenantTransaction: <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: TenantTransactionOptions,
  ) => Promise<T>;

  constructor(config: ConfigService, tenantContext: TenantContextService) {
    super({
      datasources: {
        db: { url: config.getOrThrow<string>('DATABASE_URL') },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const base: PrismaClient = this;

    const extended = this.$extends({
      client: {
        tenantTransaction<T>(
          fn: (tx: Prisma.TransactionClient) => Promise<T>,
          options: TenantTransactionOptions = {},
        ): Promise<T> {
          const tenantId = options.tenantId ?? tenantContext.requireTenantId();
          return base.$transaction(
            async (tx) => {
              await setTenant(tx, tenantId);
              return tenantContext.runInTransaction(tenantId, () => fn(tx));
            },
            {
              isolationLevel: options.isolationLevel,
              maxWait: 10000,
              timeout: 15000,
            },
          );
        },
      },
      query: {
        $allModels: {
          // Cada operação de uma requisição autenticada roda numa transação
          // interativa que primeiro define o tenant da sessão no banco e depois
          // executa a própria operação no cliente da transação. Assim, cada
          // operação ocupa uma única conexão do pool (uma versão anterior usava
          // transação em lote e travava o pool sob consultas concorrentes).
          async $allOperations({ model, operation, args, query }) {
            const tenantId = tenantContext.tenantId;
            if (!tenantId || tenantContext.inTransaction) {
              return query(args);
            }
            const delegate = model.charAt(0).toLowerCase() + model.slice(1);
            return base.$transaction(
              async (tx) => {
                await setTenant(tx, tenantId);
                const target = (tx as unknown as Record<string, ModelDelegate>)[
                  delegate
                ];
                return target[operation](args);
              },
              { maxWait: 10000, timeout: 15000 },
            );
          },
        },
      },
    });

    // O Nest passa a injetar o cliente estendido no lugar da instância base.
    return extended as unknown as this;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
