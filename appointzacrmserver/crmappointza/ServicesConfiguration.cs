using CrmAppointza.AwsS3;
using CrmAppointza.Services;
// using CrmAppointza.Authentication.Services;
// using CrmAppointza.FirebaseNotification.Services;
// using CrmAppointza.Sms.Services;
// using CrmAppointza.WhatsAppMsg.Services;
using CrmAppointza.Utils;

namespace CrmAppointza
{
    public static class ServicesConfiguration
    {
        public static void AddCustomServices(this IServiceCollection services)
        {
            // services.AddSingleton<UserSocketService>();
            services.AddSingleton<IQueryBuilderProvider, QueryBuilderProvider>();
            services.AddTransient<CustomCryptography>();

            // AWS S3
            services.AddSingleton<AwsS3Service>();

            // HTTP Client for Razorpay
            // services.AddHttpClient<Razorpay.RazorpayService>(client =>
            // {
            //     client.Timeout = TimeSpan.FromSeconds(30);
            //     client.DefaultRequestHeaders.Add("User-Agent", "CrmAppointza/1.0");
            // });
            // services.AddScoped<Razorpay.RazorpayService>();
            
            // HTTP Client for Firebase Notifications
            // services.AddHttpClient<FirebaseNotificationService>(client =>
            // {
            //     client.Timeout = TimeSpan.FromSeconds(30);
            //     client.DefaultRequestHeaders.Add("User-Agent", "CrmAppointza/1.0");
            // });
            // services.AddScoped<FirebaseNotificationService>();
            
            // Firebase Admin SDK for Notifications
            // services.AddScoped<FirebaseAdminNotificationService>();

            // HTTP Client for WhatsApp API
            // services.AddHttpClient<WhatsAppMsg.Services.WhatsAppService>(client =>
            // {
            //     client.Timeout = TimeSpan.FromSeconds(30);
            //     client.DefaultRequestHeaders.Add("User-Agent", "CrmAppointza/1.0");
            // });
            // services.AddScoped<WhatsAppMsg.Services.WhatsAppService>();

            // HTTP Client for Google Geocoding API
            // services.AddHttpClient<GoogleGeocodingService>(client =>
            // {
            //     client.Timeout = TimeSpan.FromSeconds(30);
            //     client.DefaultRequestHeaders.Add("User-Agent", "CrmAppointza/1.0");
            // });
            // services.AddScoped<GoogleGeocodingService>();

            // SMS Service
            // services.AddScoped<Sms.Services.SmsService>();

            //DB - Optimized service lifetimes
            //services.AddScoped<FilesService>(); // Changed from Transient to Scoped
          
            // services.AddScoped<OrganisationLocationService>(); // Changed from Transient to Scoped
            // services.AddScoped<OrganisationService>(); // Changed from Transient to Scoped
            // Changed from Transient to Scoped - moved to Authentication
            // services.AddScoped<Authentication.Services.AuthService>(); // Authentication service
            //services.AddScoped<ReferenceTypeService>(); // Changed from Transient to Scoped
            // services.AddScoped<ReferenceValueService>();
            // services.AddScoped<OrganisationServicesService>();
            // services.AddScoped<OrganisationServiceTimingService>();
            // services.AddScoped<AppoinmentService>();
            // services.AddScoped<StaffService>();
            // services.AddScoped<TimelineService>();
            // services.AddScoped<PaymentService>();
            // services.AddScoped<LeaveDatesService>();
            // services.AddScoped<OrganisationSiteService>();
            //services.AddScoped<QRCoderService>();
            // services.AddScoped<AdminService>();
            // services.AddScoped<AppointmentRecordService>();
            // services.AddScoped<EventService>();
            // services.AddScoped<EventBookingService>();
            // services.AddScoped<ReviewService>();
            // services.AddScoped<PaymentGatewayCredentialsService>();
            // services.AddScoped<ApplicationSettingsService>();
            // services.AddScoped<WebsiteService>();
            // services.AddScoped<EnquiryService>();
            //        services.AddScoped<OrganisationServiceTimingService>();

            services.AddScoped<CrmAppointza.Services.CrmAppointza.OrganizationService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.UserService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.LeadService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.LeadGroupService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.ReferenceValueService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.TemplateService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.CampaignService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.ChannelConfigurationService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.InboundMessageService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.WhatsAppInboundMessageService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.ApiKeyService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.BillingWalletService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.BillingTransactionService>();
            services.AddScoped<CrmAppointza.Services.CrmAppointza.FacebookInboundMessageService>();

            services.AddScoped<CrmAppointza.Connect.ConnectJwtService>();
            services.AddScoped<CrmAppointza.Connect.ConnectAuthService>();
            services.AddScoped<CrmAppointza.Connect.ConnectAppService>();
            services.AddScoped<CrmAppointza.Connect.ConnectChannelConfigHelper>();
            services.AddHttpClient(nameof(CrmAppointza.Connect.ConnectWhatsAppSendService));
            services.AddScoped<CrmAppointza.Connect.ConnectWhatsAppSendService>();
            services.AddScoped<CrmAppointza.Connect.ConnectChatService>();
            services.AddScoped<CrmAppointza.Connect.ConnectWhatsAppWebhookService>();
            services.AddScoped<CrmAppointza.Connect.ConnectGooglePlacesService>();
            services.AddHostedService<CrmAppointza.Connect.ConnectStartupSeed>();

        }
    }
}
