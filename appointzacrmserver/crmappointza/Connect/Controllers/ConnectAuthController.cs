using Microsoft.AspNetCore.Mvc;

namespace CrmAppointza.Connect.Controllers
{
    [ApiController]
    [Route("auth")]
    public class ConnectAuthController : ControllerBase
    {
        readonly ConnectAuthService authService;

        public ConnectAuthController(ConnectAuthService authService)
        {
            this.authService = authService;
        }

        [HttpGet("organizations")]
        public Task<object> Organizations() => authService.ListOrganizationsForLogin();

        [HttpPost("login")]
        public Task<object> Login([FromBody] ConnectLoginDto dto) => authService.Login(dto);

        [HttpPost("register")]
        public Task<object> Register([FromBody] ConnectRegisterDto dto) => authService.Register(dto);
    }
}
