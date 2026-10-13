namespace CrmAppointza.Models.CrmAppointza
{
    public class ChannelConfiguration
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string emailconfig { get; set; }
        public string whatsappconfig { get; set; }
        public string smsconfig { get; set; }
        public string facebookconfig { get; set; }
        public string googleapikey { get; set; }
    }

    public class ChannelConfigurationSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }

    public class ChannelConfigurationDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
