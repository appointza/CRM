namespace CrmAppointza.Models.CrmAppointza
{
    public class ApiKey
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string label { get; set; }
        public string prefix { get; set; }
        public string keyhash { get; set; }
        public DateTime? createdat { get; set; }
        public DateTime? lastused { get; set; }
    }

    public class ApiKeySelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string label { get; set; }
        public string prefix { get; set; }
    }

    public class ApiKeyDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
