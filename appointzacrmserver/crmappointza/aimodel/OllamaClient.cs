using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace CrmAppointza.AiModel
{
    /// <summary>Thin wrapper over the local Ollama HTTP API. No data leaves the machine.</summary>
    public class OllamaClient
    {
        readonly HttpClient http;
        readonly OllamaSettings settings;
        readonly ILogger<OllamaClient> logger;

        public OllamaClient(HttpClient http, IOptions<OllamaSettings> settings, ILogger<OllamaClient> logger)
        {
            this.settings = settings.Value;
            this.logger = logger;
            this.http = http;
            this.http.BaseAddress = new Uri(this.settings.BaseUrl.TrimEnd('/') + "/");
            this.http.Timeout = TimeSpan.FromSeconds(this.settings.TimeoutSeconds);
        }

        public async Task<AiHealthRes> Health()
        {
            var res = new AiHealthRes { baseUrl = settings.BaseUrl, defaultModel = settings.Model };
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                using var resp = await http.GetAsync("api/tags", cts.Token);
                resp.EnsureSuccessStatusCode();
                using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
                if (doc.RootElement.TryGetProperty("models", out var models))
                    foreach (var m in models.EnumerateArray())
                        res.models.Add(m.GetProperty("name").GetString());
                res.available = true;
                res.defaultModelInstalled = res.models.Any(n =>
                    n.Equals(settings.Model, StringComparison.OrdinalIgnoreCase) ||
                    n.Equals(settings.Model + ":latest", StringComparison.OrdinalIgnoreCase));
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Ollama not reachable at {url}", settings.BaseUrl);
                res.error = "Ollama is not reachable. Start it with: ollama serve";
            }
            return res;
        }

        public async Task<AiChatRes> Chat(string prompt, string systemPrompt = null, string model = null)
        {
            var useModel = string.IsNullOrWhiteSpace(model) ? settings.Model : model;
            var messages = new List<object>();
            if (!string.IsNullOrWhiteSpace(systemPrompt))
                messages.Add(new { role = "system", content = systemPrompt });
            // qwen3 honours /no_think to skip its long reasoning phase (much faster on CPU)
            messages.Add(new { role = "user", content = useModel.StartsWith("qwen3", StringComparison.OrdinalIgnoreCase) ? prompt + " /no_think" : prompt });

            var options = new Dictionary<string, object> { ["temperature"] = settings.Temperature };
            if (settings.NumGpu.HasValue) options["num_gpu"] = settings.NumGpu.Value;

            var body = new
            {
                model = useModel,
                messages,
                stream = false,
                think = false,
                options
            };

            var sw = Stopwatch.StartNew();
            using var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            using var resp = await http.PostAsync("api/chat", content);
            var text = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
                throw new InvalidOperationException($"Ollama error ({(int)resp.StatusCode}): {text}");

            using var doc = JsonDocument.Parse(text);
            var reply = doc.RootElement.GetProperty("message").GetProperty("content").GetString() ?? "";
            // Some models still emit reasoning blocks; keep only the answer.
            // The opening tag can be missing, so drop everything up to the last closing tag.
            var closeIdx = reply.LastIndexOf("</think>", StringComparison.OrdinalIgnoreCase);
            if (closeIdx >= 0) reply = reply.Substring(closeIdx + "</think>".Length);
            reply = Regex.Replace(reply, @"<think>.*?</think>", "", RegexOptions.Singleline).Trim();

            return new AiChatRes { reply = reply, model = useModel, durationMs = sw.ElapsedMilliseconds };
        }
    }
}
