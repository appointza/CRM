using System.Text.Json;
using System.Text.RegularExpressions;

namespace CrmAppointza.Connect
{
    static class ConnectWhatsAppUtil
    {
        public const string MetaGraphVersion = "v25.0";

        public static string NormalizeWhatsAppTo(string? phone, string defaultCountryCode = "91")
        {
            if (string.IsNullOrWhiteSpace(phone)) return "";
            var digits = Regex.Replace(phone, @"\D", "");
            if (digits.Length == 0) return "";
            if (digits.Length == 10 && !string.IsNullOrEmpty(defaultCountryCode))
                return $"{defaultCountryCode}{digits}";
            return digits;
        }

        public static string ExtractMessageText(JsonElement msg)
        {
            if (msg.TryGetProperty("text", out var text) && text.TryGetProperty("body", out var body))
                return body.GetString() ?? "";

            if (msg.TryGetProperty("button", out var button) && button.TryGetProperty("text", out var bt))
                return bt.GetString() ?? "";

            if (msg.TryGetProperty("interactive", out var interactive))
            {
                if (interactive.TryGetProperty("button_reply", out var br))
                {
                    if (br.TryGetProperty("title", out var t) && t.GetString() is { Length: > 0 } title) return title;
                    if (br.TryGetProperty("id", out var id)) return id.GetString() ?? "[Button reply]";
                }
                if (interactive.TryGetProperty("list_reply", out var lr))
                {
                    if (lr.TryGetProperty("title", out var lt) && lt.GetString() is { Length: > 0 } title) return title;
                    if (lr.TryGetProperty("description", out var ld) && ld.GetString() is { Length: > 0 } desc) return desc;
                    if (lr.TryGetProperty("id", out var lid)) return lid.GetString() ?? "[List reply]";
                }
            }

            var type = msg.TryGetProperty("type", out var typeEl) ? typeEl.GetString() ?? "unknown" : "unknown";
            if (msg.TryGetProperty(type, out var media))
            {
                if (media.TryGetProperty("caption", out var cap) && cap.GetString() is { Length: > 0 } caption)
                    return caption;
                if (type == "document" && media.TryGetProperty("filename", out var fn))
                    return $"[Document] {fn.GetString()}";
            }

            if (type == "location" && msg.TryGetProperty("location", out var loc))
            {
                var parts = new List<string>();
                if (loc.TryGetProperty("name", out var n) && n.GetString() is { Length: > 0 } name) parts.Add(name);
                if (loc.TryGetProperty("address", out var a) && a.GetString() is { Length: > 0 } addr) parts.Add(addr);
                if (parts.Count > 0) return string.Join(" — ", parts);
                return "[Location]";
            }

            if (type == "contacts") return "[Contact]";
            if (type == "reaction" && msg.TryGetProperty("reaction", out var reaction))
            {
                if (reaction.TryGetProperty("emoji", out var em) && em.GetString() is { Length: > 0 } emoji)
                    return $"[Reaction] {emoji}";
                return "[Reaction removed]";
            }

            if (type is "image" or "video" or "audio" or "sticker" or "document")
                return $"[{char.ToUpper(type[0])}{type[1..]}]";

            return $"[{type}]";
        }

        public static string MetaSendErrorMessage(JsonElement data, int status)
        {
            var message = data.TryGetProperty("error", out var err) && err.TryGetProperty("message", out var m)
                ? m.GetString() ?? $"Meta API error ({status})"
                : $"Meta API error ({status})";
            var code = err.TryGetProperty("code", out var c) && c.TryGetInt32(out var codeVal) ? codeVal : (int?)null;
            if (code == 131047 || Regex.IsMatch(message, @"re-engagement|24 hour|24-hour|more than 24", RegexOptions.IgnoreCase))
            {
                return "WhatsApp rejected free-text: the customer must message you first, or you must send an approved " +
                       "template (try \"hello_world\") to open the 24-hour chat window. Meta: " + message;
            }
            return message;
        }
    }
}
