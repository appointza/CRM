using Microsoft.AspNetCore.Mvc;
using CrmAppointza.Models;
using CrmAppointza.Services;
using CrmAppointza.Utils;
using CrmAppointza.ViewModels;

namespace CrmAppointza.ViewComponents
{
    public class AppFooterMobileViewComponent : ViewComponent
    {
        RequestState requeststate;
        public AppFooterMobileViewComponent(RequestState requeststate)
        {
            this.requeststate = requeststate;
           
        }
        public async Task<IViewComponentResult> InvokeAsync()
        {
            AppFooterMobileViewModel data = new AppFooterMobileViewModel();
            

            return View(data);
        }
    }
}
