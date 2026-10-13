namespace CrmAppointza.Models.CrmAppointza
{
    public class User
    {
        public string id { get; set; }
        public string name { get; set; }
        public string email { get; set; }
        public string passwordhash { get; set; }
        public string role { get; set; }
        public string organizationid { get; set; }
    }

    public class UserSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string name { get; set; }
        public string email { get; set; }
        public string role { get; set; }
    }

    public class UserDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }
}
