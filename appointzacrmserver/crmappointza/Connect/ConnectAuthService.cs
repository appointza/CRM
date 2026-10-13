using BCrypt.Net;
using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Services.CrmAppointza;
using CrmAppointza.Utils;

namespace CrmAppointza.Connect
{
    public class ConnectAuthService
    {
        readonly UserService userService;
        readonly OrganizationService organizationService;
        readonly BillingWalletService billingWalletService;
        readonly ChannelConfigurationService channelConfigurationService;
        readonly TemplateService templateService;
        readonly ReferenceValueService referenceValueService;
        readonly ConnectJwtService jwtService;

        public ConnectAuthService(
            UserService userService,
            OrganizationService organizationService,
            BillingWalletService billingWalletService,
            ChannelConfigurationService channelConfigurationService,
            TemplateService templateService,
            ReferenceValueService referenceValueService,
            ConnectJwtService jwtService)
        {
            this.userService = userService;
            this.organizationService = organizationService;
            this.billingWalletService = billingWalletService;
            this.channelConfigurationService = channelConfigurationService;
            this.templateService = templateService;
            this.referenceValueService = referenceValueService;
            this.jwtService = jwtService;
        }

        public async Task<object> ListOrganizationsForLogin()
        {
            var orgs = await organizationService.Select(new OrganizationSelectReq());
            return orgs.OrderBy(o => o.name).Select(o => new { id = o.id, name = o.name }).ToList();
        }

        public async Task<object> Login(ConnectLoginDto dto)
        {
            var email = (dto.email ?? "").Trim().ToLowerInvariant();
            if (email.Length == 0 || string.IsNullOrWhiteSpace(dto.password))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Invalid credentials");

            var users = await userService.Select(new UserSelectReq { email = email });
            var user = users.FirstOrDefault(u =>
                string.Equals(u.email, email, StringComparison.OrdinalIgnoreCase));
            if (user == null || string.IsNullOrWhiteSpace(user.passwordhash) ||
                !BCrypt.Net.BCrypt.Verify(dto.password, user.passwordhash))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid credentials");

            if (user.role != ConnectTenant.SuperAdminRole &&
                !string.IsNullOrWhiteSpace(dto.organizationId) &&
                !string.Equals(dto.organizationId, user.organizationid, StringComparison.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "User does not belong to the selected organization");

            Organization? organization = null;
            if (user.role == ConnectTenant.SuperAdminRole)
            {
                if (!string.IsNullOrWhiteSpace(dto.organizationId))
                    organization = (await organizationService.Select(new OrganizationSelectReq { id = dto.organizationId })).FirstOrDefault();
                organization ??= (await organizationService.Select(new OrganizationSelectReq())).OrderBy(o => o.createdat).FirstOrDefault();
            }
            else if (!string.IsNullOrWhiteSpace(user.organizationid))
            {
                organization = (await organizationService.Select(new OrganizationSelectReq { id = user.organizationid })).FirstOrDefault();
            }

            return new
            {
                access_token = jwtService.Sign(user),
                user = ConnectJsonMapper.User(user),
                organization = organization == null ? null : ConnectJsonMapper.Organization(organization),
            };
        }

        public async Task<object> Register(ConnectRegisterDto dto)
        {
            var email = (dto.email ?? "").Trim().ToLowerInvariant();
            if (await userService.Select(new UserSelectReq { email = email }) is { Count: > 0 })
                throw new AppException(AppException.ErrorCodes.UsersDuplicate, "Email already registered");

            var org = await organizationService.Insert(new Organization
            {
                name = dto.orgName,
                plan = "Starter",
                country = "IN",
                timezone = "Asia/Kolkata",
                createdat = DateTime.UtcNow,
            });

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.password, 10);
            var user = await userService.Insert(new User
            {
                name = dto.adminName,
                email = email,
                passwordhash = passwordHash,
                role = "org_admin",
                organizationid = org.id,
            });

            await billingWalletService.Insert(new BillingWallet
            {
                organizationid = org.id,
                balance = 25,
            });

            await channelConfigurationService.Insert(new ChannelConfiguration
            {
                organizationid = org.id,
                emailconfig = "{}",
                whatsappconfig = "{}",
                smsconfig = "{}",
                facebookconfig = "{}",
            });

            await templateService.Insert(new Template
            {
                organizationid = org.id,
                channel = "sms",
                name = "Welcome",
                body = "Hi {{name}}, welcome!",
            });

            await referenceValueService.SeedDefaultsIfMissing(org.id!);

            return new
            {
                access_token = jwtService.Sign(user),
                user = ConnectJsonMapper.User(user),
                organization = ConnectJsonMapper.Organization(org),
            };
        }

        public async Task SeedSuperAdminIfMissing()
        {
            var email = (Environment.GetEnvironmentVariable("SUPER_ADMIN_EMAIL") ?? "super@crm.app").Trim().ToLowerInvariant();
            var password = Environment.GetEnvironmentVariable("SUPER_ADMIN_PASSWORD") ?? "demo";
            if ((await userService.Select(new UserSelectReq { email = email })).Count > 0)
                return;

            await userService.Insert(new User
            {
                name = "Platform Owner",
                email = email,
                passwordhash = BCrypt.Net.BCrypt.HashPassword(password, 10),
                role = ConnectTenant.SuperAdminRole,
                organizationid = null,
            });
        }
    }
}
