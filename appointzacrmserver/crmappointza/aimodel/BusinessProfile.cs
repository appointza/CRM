namespace CrmAppointza.AiModel
{
    /// <summary>The seller's own business knowledge base used by every AI feature.</summary>
    public class BusinessProfile
    {
        public string companyName { get; set; }
        public string description { get; set; }
        public string category { get; set; }
        public string subcategory { get; set; }
        public string website { get; set; }
        public string phone { get; set; }
        public string email { get; set; }
        public string address { get; set; }

        public List<ServiceItem> services { get; set; } = new();
        public List<PackageItem> packages { get; set; } = new();

        public string targetAudience { get; set; }
        public string idealCustomerProfile { get; set; }
        public List<string> targetIndustries { get; set; } = new();
        public string problemsSolved { get; set; }
        public string competitors { get; set; }
        public string competitiveAdvantages { get; set; }
        public string salesStrategy { get; set; }
        public string marketingApproach { get; set; }
        public string customerAcquisition { get; set; }
        public string additionalInfo { get; set; }

        public DateTime? updatedAt { get; set; }
    }

    public class ServiceItem
    {
        public string name { get; set; }
        public string description { get; set; }
    }

    public class PackageItem
    {
        public string id { get; set; }
        public string name { get; set; }
        /// <summary>Free text on purpose (e.g. "INR 4,999 / month"). The AI may only quote what is entered here.</summary>
        public string price { get; set; }
        public string description { get; set; }
        public List<string> features { get; set; } = new();
        public List<string> benefits { get; set; } = new();
        public string uniqueSellingPoints { get; set; }
        public string idealFor { get; set; }
    }
}
