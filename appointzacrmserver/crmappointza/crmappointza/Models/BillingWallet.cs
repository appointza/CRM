namespace CrmAppointza.Models.CrmAppointza
{
    public class BillingWallet
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public decimal? balance { get; set; }
    }

    public class BillingWalletSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }

    public class BillingWalletDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
