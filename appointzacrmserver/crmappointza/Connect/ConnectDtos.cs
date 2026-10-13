namespace CrmAppointza.Connect
{
    public sealed class ConnectLoginDto
    {
        public string email { get; set; } = "";
        public string password { get; set; } = "";
        public string? organizationId { get; set; }
    }

    public sealed class ConnectRegisterDto
    {
        public string orgName { get; set; } = "";
        public string adminName { get; set; } = "";
        public string email { get; set; } = "";
        public string password { get; set; } = "";
    }

    public sealed class ConnectUserContext
    {
        public string Sub { get; init; } = "";
        public string Email { get; init; } = "";
        public string Role { get; init; } = "";
        public string? OrganizationId { get; init; }
    }
}
