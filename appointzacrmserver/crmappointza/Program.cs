using CrmAppointza.Middlewares;
using CrmAppointza.Utils;
using System.IO.Compression;
using Microsoft.AspNetCore.Hosting;

namespace CrmAppointza
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var app = CreateWebApplication(args);
            try
            {
                var preset = new Preset();
                await preset.Start(app);
                app.Run();
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
            finally
            {
                Console.ReadKey();
            }
        }
        public static WebApplication CreateWebApplication(string[] args)
        {
            var contentRoot = AppContext.BaseDirectory;
            var wwwrootPath = Path.Combine(contentRoot, "wwwroot");
            var hasWwwroot = Directory.Exists(wwwrootPath);

            var builder = WebApplication.CreateBuilder(new WebApplicationOptions
            {
                Args = args,
                ContentRootPath = hasWwwroot ? contentRoot : Directory.GetCurrentDirectory(),
                WebRootPath = hasWwwroot ? wwwrootPath : "wwwroot",
            });

            var crmUrls = CrmAppointzaUrls.Load();

            // Appointza-style: crmappointza-urls.json (next to exe, or connect-crm/public in dev)
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
            {
                crmUrls.BindKestrel(builder);
            }

            var serverApiBase = crmUrls.ResolveServerApiBaseUrl();
            builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ApplicationSettings:baseUrl"] = serverApiBase,
            });
            Console.WriteLine($"  apiBaseUrl (server): {serverApiBase}");

            builder.Services.Configure<ApplicationEnvironment>(builder.Configuration.GetSection("ApplicationSettings"));
            var appSettings = builder.Configuration.GetSection("ApplicationSettings").Get<ApplicationEnvironment>();
            builder.Logging.ClearProviders();
            builder.Logging.AddConsole();
            builder.Logging.AddLog4Net("log4net.config");

            builder.Services.AddScoped<CrmAppointza.Filters.BaseUrlViewDataFilter>();
            builder.Services.AddControllersWithViews(options =>
            {
                // Add base URL filter to inject base URL into all views
                options.Filters.AddService<CrmAppointza.Filters.BaseUrlViewDataFilter>();
            }).AddJsonOptions(jsonOptions =>
            {
                jsonOptions.JsonSerializerOptions.PropertyNamingPolicy = null;
            });

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            
            // Add CORS services
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowSpecificOrigins", policy =>
                {
                    policy.WithOrigins(
                            "http://localhost:3000",      // React development server
                            "http://localhost:8080",      // Your current server port
                            "http://192.168.29.69:8080",  // Your current network IP
                            "http://192.168.31.122:8080", // Your network IP
                            "https://localhost:7117",  // Production domain
                            "https://appointza.com" ,      // Production domain without www
                            "http://localhost:5117",
                            "http://localhost:5050"
                        )
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials(); // Allow cookies and authentication headers
                });
            });
            
            // Add health checks (Npgsql registration throws if connection string is null)
            var healthChecks = builder.Services.AddHealthChecks();
            if (!string.IsNullOrWhiteSpace(appSettings?.postgresqlconnection))
                healthChecks.AddNpgSql(appSettings.postgresqlconnection, name: "postgresql");
            healthChecks.AddRedis(appSettings.redis?.connection_string ?? "localhost:6379", name: "redis");
            
            // Add caching services
            builder.Services.AddMemoryCache();
            builder.Services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = appSettings.redis?.connection_string ?? "localhost:6379";
                options.InstanceName = appSettings.redis?.instance_name ?? "CrmAppointza";
            });

            // Add response compression
            builder.Services.AddResponseCompression();
            builder.Services.AddSwaggerGen(options =>
            {
                //options.CustomSchemaIds(type => type.ToString());
                options.CustomSchemaIds(type => type.FullName.Replace("+", "."));
            });
            builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            builder.Services.AddSingleton<AppState>();
            builder.Services.AddScoped<RequestState>();
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
            builder.Services.AddScoped<IDbProvider, PostgreSQLProvider>();
            builder.Services.AddCustomServices();

            // Local AI (Ollama)
            builder.Services.Configure<CrmAppointza.AiModel.OllamaSettings>(builder.Configuration.GetSection("Ollama"));
            builder.Services.AddHttpClient<CrmAppointza.AiModel.OllamaClient>();
            builder.Services.AddSingleton<CrmAppointza.AiModel.BusinessProfileStore>();

            var jwtSecret = appSettings?.jwtsecret
                ?? Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? "connect-crm-dev-secret-change-me";
            builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                    {
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ValidateLifetime = true,
                        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                            System.Text.Encoding.UTF8.GetBytes(jwtSecret)),
                    };
                });
            builder.Services.AddAuthorization();
            
            // B2B Services
            builder.Services.AddHttpClient<CrmAppointza.integrations.Authentication.Services.IB2BClientService, CrmAppointza.integrations.Authentication.Services.B2BClientService>();
            builder.Services.Configure<CookiePolicyOptions>(options =>
            {
                options.MinimumSameSitePolicy = SameSiteMode.Unspecified;
                options.OnAppendCookie = cookieContext =>
                    cookieContext.CookieOptions.SameSite = SameSiteMode.None;
                options.OnDeleteCookie = cookieContext =>
                    cookieContext.CookieOptions.SameSite = SameSiteMode.None;
                options.Secure = CookieSecurePolicy.Always; // required for chromium-based browsers

            });
            var app = builder.Build();

            var listenPort = crmUrls.Port;
            Console.WriteLine();
            Console.WriteLine($"CrmAppointza is listening on port {listenPort}.");
            Console.WriteLine($"Open the UI: http://localhost:{listenPort}/");
            Console.WriteLine();
            
            // Enable response compression
            app.UseResponseCompression();

            var browserUrlsPayload = crmUrls.ToBrowserPayload();
            app.Use(async (context, next) =>
            {
                if (string.Equals(context.Request.Path.Value, CrmAppointzaUrls.RequestPath, StringComparison.OrdinalIgnoreCase))
                {
                    context.Response.Headers.CacheControl = "no-store";
                    await context.Response.WriteAsJsonAsync(browserUrlsPayload);
                    return;
                }
                await next();
            });
            
            app.Use((context, next) =>
            {
                context.Response.Headers["X-Frame-Options"] = "ALLOWALL";
                return next.Invoke();
            });
            
            // Enable CORS - must be placed before other middleware
              app.UseCors(x => x
                .AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader());
            //if (app.Environment.IsDevelopment())
            //{
            app.UseSwagger();
            app.UseSwaggerUI();

            // Connect REST returns JSON via ErrorHandlerMiddleware; avoid HTML error pages for /leads, /auth, etc.
            app.UseHsts();
            app.UseCookiePolicy();
            //app.UseHttpsRedirection();
            app.UseMiddleware<ErrorHandlerMiddleware>();
            app.UseWebSockets();
            //app.UseMiddleware<JwtMiddleware>();
            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.UseMiddleware<MobileRedirectMiddleware>();
            
            // ✅ MIDDLEWARE FOR /api/b2b (B2B server-to-server authentication)
            app.UseMiddleware<CrmAppointza.integrations.Authentication.Middlewares.ServerToServerAuthMiddleware>();
        // Extract organization from subdomain
            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();
            
            // Map specific MVC routes that should be handled by controllers
            app.MapControllerRoute(
                name: "services",
                pattern: "services",
                defaults: new { controller = "Home", action = "Services" });

            app.MapControllerRoute(
                name: "explore-services",
                pattern: "explore-services",
                defaults: new { controller = "Home", action = "ExploreServices" });

            app.MapControllerRoute(
                name: "explore",
                pattern: "explore",
                defaults: new { controller = "Home", action = "Services" });

            // Map API routes - these should be handled by API controllers
            app.MapControllers();

            // Root "/" is served by MapFallback (wwwroot/index.html) when the SPA is published there.
            // A default Home/Index MVC route is omitted because no HomeController exists in this project.

            // Add health check endpoint
            app.MapHealthChecks("/health");

            // Custom fallback that serves index.html for all non-API, non-MVC routes
            // This ensures React Router can handle client-side routing
            app.MapFallback(async context =>
            {
                var path = context.Request.Path.Value?.ToLower() ?? "";
                
                // Skip fallback for API routes, static files, and health checks
                if (path.StartsWith("/api/") ||
                    path.StartsWith("/auth") ||
                    path.StartsWith("/leads") ||
                    path.StartsWith("/organizations") ||
                    path.StartsWith("/dashboard") ||
                    path.StartsWith("/billing") ||
                    path.StartsWith("/users") ||
                    path.StartsWith("/templates") ||
                    path.StartsWith("/campaigns") ||
                    path.StartsWith("/tenants") ||
                    path.StartsWith("/webhooks") ||
                    path.StartsWith("/whatsapp") ||
                    path.StartsWith("/web-proxy") ||
                    path.StartsWith("/api-info") ||
                    path.StartsWith("/swagger") || 
                    path.StartsWith("/health") ||
                    path.StartsWith("/assets/") ||
                    path.StartsWith("/css/") ||
                    path.StartsWith("/js/") ||
                    path.StartsWith("/lib/") ||
                    path.StartsWith("/images/") ||
                    path.StartsWith("/lovable-uploads/") ||
                    path.EndsWith(".js") ||
                    path.EndsWith(".css") ||
                    path.EndsWith(".png") ||
                    path.EndsWith(".jpg") ||
                    path.EndsWith(".svg") ||
                    path.EndsWith(".ico") ||
                    (path.EndsWith(".json") && !path.Equals("/crmappointza-urls.json", StringComparison.OrdinalIgnoreCase)) ||
                    path.EndsWith(".woff") ||
                    path.EndsWith(".woff2") ||
                    path.EndsWith(".ttf"))
                {
                    context.Response.StatusCode = 404;
                    await context.Response.WriteAsync("Not found");
                    return;
                }
                
                // Check if this is a subdomain pattern request
                var host = context.Request.Host.Host;
               
               
                
             
                    // For non-subdomain patterns (like localhost), serve index.html for React Router
                    var webHostEnvironment = context.RequestServices.GetRequiredService<IWebHostEnvironment>();
                    var indexPath = Path.Combine(webHostEnvironment.WebRootPath, "index.html");
                    
                    if (File.Exists(indexPath))
                    {
                        context.Response.ContentType = "text/html";
                        await context.Response.SendFileAsync(indexPath);
                    }
                    else
                    {
                        context.Response.StatusCode = 404;
                        await context.Response.WriteAsync("Page not found");
                    }
                
            });
            return app;
        }
    }
}

