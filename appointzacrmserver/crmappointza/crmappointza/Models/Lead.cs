namespace CrmAppointza.Models.CrmAppointza
{
    public class Lead
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string name { get; set; }
        public string phone { get; set; }
        public string email { get; set; }
        public string facebookpsid { get; set; }
        public string businessname { get; set; }
        public string ownername { get; set; }
        public string category { get; set; }
        public string website { get; set; }
        public string mapsurl { get; set; }
        public string address { get; set; }
        public string pincode { get; set; }
        public string area { get; set; }
        public string city { get; set; }
        public string state { get; set; }
        public string type { get; set; }
        public string tags { get; set; }
        public string notes { get; set; }
        public string stagehistory { get; set; }
        public DateTime? createdat { get; set; }
        public string source { get; set; }
    }

    public class LeadSelectReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
        public string name { get; set; }
        public string email { get; set; }
        public string phone { get; set; }
        public string source { get; set; }
    }

    public class LeadDeleteReq
    {
        public string id { get; set; }
        public string organizationid { get; set; }
    }

    public class LeadBulkInsertReq
    {
        public string organizationid { get; set; }
        public List<Lead> items { get; set; } = new();
    }

    public class LeadTransitionReq
    {
        public string id { get; set; }
        public string toType { get; set; }
        public string reason { get; set; }
        public string byUserId { get; set; }
    }

    public class LeadAddNoteReq
    {
        public string id { get; set; }
        public string text { get; set; }
        public string byUserId { get; set; }
    }

    public class LeadBulkInsertRes
    {
        public bool ok { get; set; }
        public int created { get; set; }
        public int failed { get; set; }
        public List<object> errors { get; set; } = new();
        public List<Lead> leads { get; set; } = new();
    }

    public class LeadPlaceImportRow
    {
        public string placeId { get; set; }
        public Lead lead { get; set; }
    }

    public class LeadImportFromPlacesRes
    {
        public bool ok { get; set; } = true;
        public int created { get; set; }
        public int skipped { get; set; }
        public List<object> items { get; set; } = new();
    }
}
