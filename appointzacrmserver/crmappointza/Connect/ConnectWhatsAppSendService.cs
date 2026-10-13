using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CrmAppointza.Services.CrmAppointza;
using CrmAppointza.Utils;

namespace CrmAppointza.Connect
{
    public class ConnectWhatsAppSendService
    {
        readonly ChannelConfigurationService channelConfigurationService;
        readonly IHttpClientFactory httpClientFactory;

        public ConnectWhatsAppSendService(
            ChannelConfigurationService channelConfigurationService,
            IHttpClientFactory httpClientFactory)
        {
            this.channelConfigurationService = channelConfigurationService;
            this.httpClientFactory = httpClientFactory;
        }

        public async Task<(string to, string? messageId)> SendText(string organizationId, string toPhone, string text)
        {
            var (phoneNumberId, accessToken) = await GetCredentials(organizationId);
            var to = ConnectWhatsAppUtil.NormalizeWhatsAppTo(toPhone);
            var body = text?.Trim() ?? "";
            if (string.IsNullOrEmpty(to))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Recipient phone number is required");
            if (string.IsNullOrEmpty(body))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Message text is required");

            var payload = new
            {
                messaging_product = "whatsapp",
                to,
                type = "text",
                text = new { body },
            };

            var messageId = await PostToMeta(phoneNumberId, accessToken, payload);
            return (to, messageId);
        }

        public async Task<(string to, string? messageId)> SendTemplate(
            string organizationId,
            string toPhone,
            string templateName,
            string language,
            IReadOnlyList<string>? parameters = null)
        {
            var (phoneNumberId, accessToken) = await GetCredentials(organizationId);
            var to = ConnectWhatsAppUtil.NormalizeWhatsAppTo(toPhone);
            if (string.IsNullOrEmpty(to))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Recipient phone number is required");
            if (string.IsNullOrWhiteSpace(templateName))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Template name is required");

            var template = new Dictionary<string, object>
            {
                ["name"] = templateName.Trim(),
                ["language"] = new { code = (language ?? "en_US").Trim() },
            };

            var paramList = (parameters ?? Array.Empty<string>())
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => new { type = "text", text = p })
                .ToList();
            if (paramList.Count > 0)
            {
                template["components"] = new[]
                {
                    new { type = "body", parameters = paramList },
                };
            }

            var payload = new
            {
                messaging_product = "whatsapp",
                to,
                type = "template",
                template,
            };

            var messageId = await PostToMeta(phoneNumberId, accessToken, payload);
            return (to, messageId);
        }

        async Task<(string phoneNumberId, string accessToken)> GetCredentials(string organizationId)
        {
            var row = await channelConfigurationService.EnsureForOrganization(organizationId);
            var wa = ConnectChannelConfigHelper.ParseConfigObject(row.whatsappconfig);
            var phoneNumberId = wa["phoneNumberId"]?.GetValue<string>()?.Trim() ?? "";
            var accessToken = wa["accessToken"]?.GetValue<string>()?.Trim() ?? "";
            if (string.IsNullOrEmpty(phoneNumberId))
                throw new AppException(AppException.ErrorCodes.BadRequest,
                    "WhatsApp Phone number ID is missing. Add it in Settings → WhatsApp and click Save.");
            if (string.IsNullOrEmpty(accessToken))
                throw new AppException(AppException.ErrorCodes.BadRequest,
                    "WhatsApp access token is missing. Add it in Settings → WhatsApp and click Save.");
            return (phoneNumberId, accessToken);
        }

        async Task<string?> PostToMeta(string phoneNumberId, string accessToken, object payload)
        {
            var client = httpClientFactory.CreateClient(nameof(ConnectWhatsAppSendService));
            var url =
                $"https://graph.facebook.com/{ConnectWhatsAppUtil.MetaGraphVersion}/{Uri.EscapeDataString(phoneNumberId)}/messages";
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var res = await client.SendAsync(req);
            var resText = await res.Content.ReadAsStringAsync();
            JsonElement data;
            try
            {
                data = JsonSerializer.Deserialize<JsonElement>(resText);
            }
            catch
            {
                throw new AppException(AppException.ErrorCodes.BadRequest,
                    $"Meta API returned invalid JSON ({(int)res.StatusCode})");
            }

            if (!res.IsSuccessStatusCode)
            {
                throw new AppException(AppException.ErrorCodes.BadRequest,
                    ConnectWhatsAppUtil.MetaSendErrorMessage(data, (int)res.StatusCode));
            }

            if (data.TryGetProperty("messages", out var messages) &&
                messages.GetArrayLength() > 0 &&
                messages[0].TryGetProperty("id", out var id))
            {
                return id.GetString();
            }

            return null;
        }
    }
}
