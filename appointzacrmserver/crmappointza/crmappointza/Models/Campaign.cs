namespace CrmAppointza.Models.CrmAppointza
{
    public class Campaign
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string name { get; set; }
        public string channel { get; set; }
        public string templateid { get; set; }
        public string leadids { get; set; }
        public string status { get; set; }
        public int? sent { get; set; }
        public int? delivered { get; set; }
        public int? failed { get; set; }
        public DateTime? createdat { get; set; }
        public string recipientresults { get; set; }
    }

    public class CampaignSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string name { get; set; }
        public string channel { get; set; }
        public string status { get; set; }
    }

    public class CampaignDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
