namespace CrmAppointza.Models.CrmAppointza
{
    public class BillingTransaction
    {
        public string id { get; set; }
        public string walletid { get; set; }
        public DateTime? date { get; set; }
        public string description { get; set; }
        public decimal? amount { get; set; }
        public string type { get; set; }
        public string channel { get; set; }
    }

    public class BillingTransactionSelectReq
    {
        public string id { get; set; }
        public string walletid { get; set; }
        public string type { get; set; }
        public string channel { get; set; }
    }

    public class BillingTransactionDeleteReq
    {
        public string id { get; set; }
    }
}
