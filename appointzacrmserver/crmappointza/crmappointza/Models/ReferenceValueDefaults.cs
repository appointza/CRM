namespace CrmAppointza.Models.CrmAppointza
{
    public sealed class ReferenceValueSeedRow
    {
        public string code { get; init; }
        public string category { get; init; }
        public string referencevalue { get; init; }
        public string referencecode { get; init; }
        public string colorcode { get; init; }
    }

    public static class ReferenceValueDefaults
    {
        public const string CategoryLeadStage = "lead_stage";
        public const string CategoryLeadSource = "lead_source";

        public static readonly ReferenceValueSeedRow[] SeedRows =
        {
            new() { code = "lead", category = CategoryLeadStage, referencevalue = "Lead", referencecode = "prospect,call,loss", colorcode = "#3B82F6" },
            new() { code = "prospect", category = CategoryLeadStage, referencevalue = "Prospect", referencecode = "call,customer,loss", colorcode = "#F59E0B" },
            new() { code = "call", category = CategoryLeadStage, referencevalue = "Call", referencecode = "prospect,customer,loss", colorcode = "#A855F7" },
            new() { code = "customer", category = CategoryLeadStage, referencevalue = "Customer", referencecode = "discontinued,loss", colorcode = "#10B981" },
            new() { code = "discontinued", category = CategoryLeadStage, referencevalue = "Discontinued", referencecode = "customer,loss", colorcode = "#F97316" },
            new() { code = "loss", category = CategoryLeadStage, referencevalue = "Loss", referencecode = "", colorcode = "#EF4444" },
            new() { code = "manual", category = CategoryLeadSource, referencevalue = "Manual entry", referencecode = "", colorcode = "#6B7280" },
            new() { code = "website_form", category = CategoryLeadSource, referencevalue = "Website form", referencecode = "", colorcode = "#0EA5E9" },
            new() { code = "appointza", category = CategoryLeadSource, referencevalue = "Appointza", referencecode = "", colorcode = "#8B5CF6" },
            new() { code = "import_csv", category = CategoryLeadSource, referencevalue = "CSV import", referencecode = "", colorcode = "#64748B" },
            new() { code = "referral", category = CategoryLeadSource, referencevalue = "Referral", referencecode = "", colorcode = "#14B8A6" },
            new() { code = "campaign", category = CategoryLeadSource, referencevalue = "Campaign", referencecode = "", colorcode = "#EC4899" },
            new() { code = "walk_in", category = CategoryLeadSource, referencevalue = "Walk-in", referencecode = "", colorcode = "#84CC16" },
            new() { code = "other", category = CategoryLeadSource, referencevalue = "Other", referencecode = "", colorcode = "#9CA3AF" },
        };
    }
}
