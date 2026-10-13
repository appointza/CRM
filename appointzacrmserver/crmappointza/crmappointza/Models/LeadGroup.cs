namespace CrmAppointza.Models.CrmAppointza
{
    public class LeadGroup
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string name { get; set; }
        public string leadids { get; set; }
        public DateTime? createdat { get; set; }
    }

    public class LeadGroupSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string name { get; set; }
    }

    public class LeadGroupDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
