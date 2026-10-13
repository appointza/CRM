namespace CrmAppointza.Connect
{
    public class ConnectStartupSeed : IHostedService
    {
        readonly IServiceProvider services;

        public ConnectStartupSeed(IServiceProvider services)
        {
            this.services = services;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = services.CreateScope();
                var auth = scope.ServiceProvider.GetRequiredService<ConnectAuthService>();
                await auth.SeedSuperAdminIfMissing();
            }
            catch (Exception ex)
            {
                var log = services.GetRequiredService<ILogger<ConnectStartupSeed>>();
                log.LogWarning(
                    ex,
                    "Connect super-admin seed skipped. Use Database=crma with Connect CRM schema (users.name column), not legacy campusza.");
            }
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
