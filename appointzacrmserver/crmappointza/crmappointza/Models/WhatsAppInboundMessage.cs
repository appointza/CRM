namespace CrmAppointza.Models.CrmAppointza
{
    public class WhatsAppInboundMessage
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string phonenumberid { get; set; }
        public string fromphone { get; set; }
        public string messagetype { get; set; }
        public string textbody { get; set; }
        public string wamessageid { get; set; }
        public string eventtype { get; set; }
        public string payload { get; set; }
        public DateTime? createdat { get; set; }
    }

    public class WhatsAppInboundMessageSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string fromphone { get; set; }
        public string phonenumberid { get; set; }
    }

    public class WhatsAppInboundMessageDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
