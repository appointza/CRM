using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CrmAppointza.Connect
{
    public class ConnectJwtService
    {
        readonly ApplicationEnvironment settings;

        public ConnectJwtService(IOptions<ApplicationEnvironment> settings)
        {
            this.settings = settings.Value;
        }

        public string Sign(User user)
        {
            var secret = settings.jwtsecret
                ?? Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? "connect-crm-dev-secret-change-me";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.id ?? ""),
                new(JwtRegisteredClaimNames.Email, user.email ?? ""),
                new("role", user.role ?? ""),
            };
            if (!string.IsNullOrWhiteSpace(user.organizationid))
                claims.Add(new Claim("organizationId", user.organizationid));

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public ConnectUserContext? TryParse(HttpContext httpContext)
        {
            var auth = httpContext.Request.Headers.Authorization.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                return null;

            var token = auth["Bearer ".Length..].Trim();
            var secret = settings.jwtsecret
                ?? Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? "connect-crm-dev-secret-change-me";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

            try
            {
                var handler = new JwtSecurityTokenHandler();
                handler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    IssuerSigningKey = key,
                }, out var validated);

                var jwt = (JwtSecurityToken)validated;
                return new ConnectUserContext
                {
                    Sub = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value ?? "",
                    Email = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email)?.Value ?? "",
                    Role = jwt.Claims.FirstOrDefault(c => c.Type == "role")?.Value ?? "",
                    OrganizationId = jwt.Claims.FirstOrDefault(c => c.Type == "organizationId")?.Value,
                };
            }
            catch
            {
                return null;
            }
        }

        public ConnectUserContext RequireUser(HttpContext httpContext)
        {
            var user = TryParse(httpContext);
            if (user == null || string.IsNullOrWhiteSpace(user.Sub))
                throw new AppException(AppException.ErrorCodes.Unauthorized, "Unauthorized");
            return user;
        }
    }
}
