namespace CrmAppointza.Models.CrmAppointza
{
    public class ReferenceValue
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string code { get; set; }
        public string referencevalue { get; set; }
        public string referencecode { get; set; }
        public string colorcode { get; set; }
        public int? monthcount { get; set; }
        public DateTime? createdat { get; set; }
        public string category { get; set; }
    }

    public class ReferenceValueSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string code { get; set; }
        public string category { get; set; }
        public string referencecode { get; set; }
    }

    public class ReferenceValueDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
