using System.Text;
using System.Text.Json;

namespace CrmAppointza.AiModel
{
    /// <summary>Stores one business profile per organization as a JSON file on this machine.</summary>
    public class BusinessProfileStore
    {
        static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true, PropertyNamingPolicy = null };
        static readonly SemaphoreSlim FileLock = new(1, 1);

        readonly string dir;

        public BusinessProfileStore(IWebHostEnvironment env)
        {
            dir = Path.Combine(env.ContentRootPath, "App_Data", "ai", "business-profiles");
        }

        string PathFor(string orgId)
        {
            var safe = new string((orgId ?? "default").Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_').ToArray());
            if (safe.Length == 0) safe = "default";
            return Path.Combine(dir, safe + ".json");
        }

        public async Task<BusinessProfile> Get(string orgId)
        {
            var path = PathFor(orgId);
            if (!File.Exists(path)) return new BusinessProfile();
            await FileLock.WaitAsync();
            try
            {
                var json = await File.ReadAllTextAsync(path);
                return JsonSerializer.Deserialize<BusinessProfile>(json, JsonOpts) ?? new BusinessProfile();
            }
            finally { FileLock.Release(); }
        }

        public async Task<BusinessProfile> Save(string orgId, BusinessProfile profile)
        {
            profile ??= new BusinessProfile();
            profile.updatedAt = DateTime.UtcNow;
            foreach (var p in profile.packages)
                if (string.IsNullOrWhiteSpace(p.id)) p.id = Guid.NewGuid().ToString("N");

            Directory.CreateDirectory(dir);
            await FileLock.WaitAsync();
            try
            {
                await File.WriteAllTextAsync(PathFor(orgId), JsonSerializer.Serialize(profile, JsonOpts));
            }
            finally { FileLock.Release(); }
            return profile;
        }

        /// <summary>Renders the profile as plain text for the model. Only fields the user filled in are included.</summary>
        public static string ToPromptContext(BusinessProfile p)
        {
            if (p == null) return "";
            var sb = new StringBuilder();
            void Line(string label, string v) { if (!string.IsNullOrWhiteSpace(v)) sb.AppendLine($"{label}: {v}"); }
            void List(string label, IEnumerable<string> v)
            {
                var items = v?.Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
                if (items?.Count > 0) sb.AppendLine($"{label}: {string.Join("; ", items)}");
            }

            Line("Company", p.companyName); Line("About", p.description);
            Line("Category", p.category); Line("Subcategory", p.subcategory);
            Line("Website", p.website); Line("Phone", p.phone); Line("Email", p.email); Line("Address", p.address);

            foreach (var s in p.services.Where(s => !string.IsNullOrWhiteSpace(s.name)))
                sb.AppendLine($"Service - {s.name}: {s.description}");
            foreach (var pk in p.packages.Where(x => !string.IsNullOrWhiteSpace(x.name)))
            {
                sb.AppendLine($"Package - {pk.name} | Price: {(string.IsNullOrWhiteSpace(pk.price) ? "not specified" : pk.price)}");
                Line("  Description", pk.description);
                List("  Features", pk.features); List("  Benefits", pk.benefits);
                Line("  Unique selling points", pk.uniqueSellingPoints); Line("  Ideal for", pk.idealFor);
            }

            Line("Target audience", p.targetAudience); Line("Ideal customer", p.idealCustomerProfile);
            List("Target industries", p.targetIndustries); Line("Problems we solve", p.problemsSolved);
            Line("Competitors", p.competitors); Line("Competitive advantages", p.competitiveAdvantages);
            Line("Sales strategy", p.salesStrategy); Line("Marketing approach", p.marketingApproach);
            Line("Customer acquisition", p.customerAcquisition); Line("Additional info", p.additionalInfo);
            return sb.ToString();
        }
    }
}
