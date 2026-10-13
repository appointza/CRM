namespace CrmAppointza.Models.CrmAppointza
{
    public class Organization
    {
        public string id { get; set; }
        public string name { get; set; }
        public string plan { get; set; }
        public string industry { get; set; }
        public string country { get; set; }
        public string timezone { get; set; }
        public string website { get; set; }
        public string supportemail { get; set; }
        public string billingemail { get; set; }
        public string address { get; set; }
        public string gstin { get; set; }
        public DateTime? createdat { get; set; }
    }

    public class OrganizationSelectReq
    {
        public string id { get; set; }
        public string name { get; set; }
    }

    public class OrganizationDeleteReq
    {
        public string id { get; set; }
    }
}
