namespace CrmAppointza.Models.CrmAppointza
{
    public class Template
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string channel { get; set; }
        public string name { get; set; }
        public string body { get; set; }
        public string language { get; set; }
        public string status { get; set; }
        public string category { get; set; }
        public string metaid { get; set; }
        public int? variablescount { get; set; }
        public string headertype { get; set; }
        public string headercontent { get; set; }
        public string footer { get; set; }
        public string buttons { get; set; }
        public string variablemapping { get; set; }
    }

    public class TemplateSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string name { get; set; }
        public string channel { get; set; }
        public string status { get; set; }
        public string category { get; set; }
    }

    public class TemplateDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
