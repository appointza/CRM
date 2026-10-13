namespace CrmAppointza.Models.CrmAppointza
{
    public class InboundMessage
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string channel { get; set; }
        public string leadid { get; set; }
        public string fromaddress { get; set; }
        public string textbody { get; set; }
        public string subject { get; set; }
        public string messagetype { get; set; }
        public string externalid { get; set; }
        public string eventtype { get; set; }
        public string payload { get; set; }
        public DateTime? createdat { get; set; }
        public string direction { get; set; }
        public string sentbyuserid { get; set; }
    }

    public class InboundMessageSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string channel { get; set; }
        public string leadid { get; set; }
        public string direction { get; set; }
    }

    public class InboundMessageDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
