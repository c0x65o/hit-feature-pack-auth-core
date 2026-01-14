declare module '@hit/feature-pack-email-core' {
  export function enqueueEmailDrizzle(opts: {
    db: unknown;
    sql: unknown;
    input: unknown;
  }): Promise<{ id: string }>;
}
