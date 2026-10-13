using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Connect.Controllers
{
    public abstract class ConnectControllerBase : ControllerBase
    {
        protected ConnectUserContext RequireUser() =>
            HttpContext.RequestServices.GetRequiredService<ConnectJwtService>().RequireUser(HttpContext);

        protected string? HeaderOrgId() => ConnectTenant.HeaderOrgId(Request);
    }
}
