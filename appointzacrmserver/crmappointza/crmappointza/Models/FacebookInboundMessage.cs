namespace CrmAppointza.Models.CrmAppointza
{
    public class FacebookInboundMessage
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string pageid { get; set; }
        public string senderid { get; set; }
        public string messagetype { get; set; }
        public string textbody { get; set; }
        public string fbmessageid { get; set; }
        public string eventtype { get; set; }
        public string payload { get; set; }
        public DateTime? createdat { get; set; }
    }

    public class FacebookInboundMessageSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string senderid { get; set; }
        public string pageid { get; set; }
    }

    public class FacebookInboundMessageDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
