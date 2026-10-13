using System.Text.Json;

namespace CrmAppointza.Utils
{
    /// <summary>
    /// Single URL config: <c>crmappointza-urls.json</c> next to <c>crmappointza.exe</c>.
    /// Served to the browser at <c>/crmappointza-urls.json</c>.
    /// </summary>
    public class CrmAppointzaUrls
    {
        public const string FileName = "crmappointza-urls.json";
        public const string RequestPath = "/" + FileName;

        public string backendListen { get; set; } = "http://0.0.0.0:5053";
        public string frontendApiBaseUrl { get; set; } = "";

        public int Port => PortFromListenUrl(backendListen);

        public static CrmAppointzaUrls Load()
        {
            var path = ResolvePath();
            if (path != null)
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<CrmAppointzaUrls>(
                        File.ReadAllText(path),
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null)
                    {
                        if (string.IsNullOrWhiteSpace(parsed.backendListen))
                            parsed.backendListen = "http://0.0.0.0:5053";
                        parsed.backendListen = parsed.backendListen.Trim();
                        parsed.frontendApiBaseUrl = (parsed.frontendApiBaseUrl ?? "").Trim().TrimEnd('/');

                        Console.WriteLine($"URLs: {path}");
                        Console.WriteLine($"  backendListen:      {parsed.backendListen}");
                        Console.WriteLine(
                            $"  frontendApiBaseUrl: {(string.IsNullOrEmpty(parsed.frontendApiBaseUrl) ? "(same host as the page)" : parsed.frontendApiBaseUrl)}");
                        return parsed;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"URLs: failed to read {path}: {ex.Message}");
                }
            }

            Console.WriteLine($"URLs: {FileName} not found next to the exe — using appsettings / defaults");
            return new CrmAppointzaUrls();
        }

        /// <summary>Deployed build: next to exe. Dev: connect-crm/public/crmappointza-urls.json.</summary>
        static string? ResolvePath()
        {
            var nextToExe = Path.Combine(AppContext.BaseDirectory, FileName);
            if (File.Exists(nextToExe))
                return Path.GetFullPath(nextToExe);

            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            for (var depth = 0; current != null && depth < 8; depth++, current = current.Parent)
            {
                var source = Path.Combine(current.FullName, "connect-crm", "public", FileName);
                if (File.Exists(source))
                    return source;
            }

            return null;
        }

        public static int PortFromListenUrl(string? listenUrl)
        {
            var text = (listenUrl ?? "").Trim().TrimEnd('/');
            var colon = text.LastIndexOf(':');
            if (colon >= 0 && int.TryParse(text[(colon + 1)..], out var port) && port > 0 && port < 65536)
                return port;
            return 5053;
        }

        public void BindKestrel(WebApplicationBuilder builder)
        {
            var port = Port;
            builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
            Console.WriteLine($"Listening on port {port} — open http://localhost:{port}/");
        }

        public string ResolveServerApiBaseUrl()
        {
            if (!string.IsNullOrWhiteSpace(frontendApiBaseUrl))
                return ToBrowserOrigin(frontendApiBaseUrl);
            return $"http://localhost:{Port}";
        }

        public object ToBrowserPayload() => new
        {
            backendListen,
            frontendApiBaseUrl = string.IsNullOrWhiteSpace(frontendApiBaseUrl)
                ? ""
                : ToBrowserOrigin(frontendApiBaseUrl),
        };

        public static string ToBrowserOrigin(string url)
        {
            var value = (url ?? "").Trim().TrimEnd('/');
            if (string.IsNullOrWhiteSpace(value))
                return "";

            try
            {
                var uri = new Uri(value);
                if (uri.Host is not ("0.0.0.0" or "::" or "[::]"))
                    return value;
                return new UriBuilder(uri) { Host = "localhost" }.Uri.ToString().TrimEnd('/');
            }
            catch
            {
                return value.Replace("://0.0.0.0", "://localhost", StringComparison.OrdinalIgnoreCase);
            }
        }
    }
}
