using CrmAppointza.Utils;
using Microsoft.AspNetCore.Http;

namespace CrmAppointza.Connect
{
    public static class ConnectTenant
    {
        public const string SuperAdminRole = "super_admin";

        public static string? HeaderOrgId(HttpRequest request)
        {
            if (!request.Headers.TryGetValue("X-Organization-Id", out var values))
                return null;
            return values.FirstOrDefault();
        }

        public static string ResolveOrganizationId(ConnectUserContext user, string? headerOrgId)
        {
            if (user.Role == SuperAdminRole)
            {
                if (string.IsNullOrWhiteSpace(headerOrgId))
                    throw new AppException(AppException.ErrorCodes.BadRequest,
                        "Super admin must pass active organization via X-Organization-Id header for this operation.");
                return headerOrgId;
            }

            if (string.IsNullOrWhiteSpace(user.OrganizationId))
                throw new AppException(AppException.ErrorCodes.Forbidden, "User is not assigned to an organization.");

            if (!string.IsNullOrWhiteSpace(headerOrgId) &&
                !string.Equals(headerOrgId, user.OrganizationId, StringComparison.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.Forbidden, "Cannot act on a different organization.");

            return user.OrganizationId;
        }

        public static bool IsOrgScoped(ConnectUserContext user, string? headerOrgId, out string? organizationId)
        {
            if (user.Role == SuperAdminRole)
            {
                organizationId = headerOrgId;
                return !string.IsNullOrWhiteSpace(organizationId);
            }
            organizationId = user.OrganizationId;
            return !string.IsNullOrWhiteSpace(organizationId);
        }
    }
}
