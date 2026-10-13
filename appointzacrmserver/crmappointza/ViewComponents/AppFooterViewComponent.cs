using Microsoft.AspNetCore.Mvc;
using CrmAppointza.Models;
using CrmAppointza.Services;
using CrmAppointza.Utils;
using CrmAppointza.ViewModels;

namespace CrmAppointza.ViewComponents
{
    public class AppFooterViewComponent : ViewComponent
    {

        RequestState requeststate;
        public AppFooterViewComponent( RequestState requeststate)
        {
            this.requeststate = requeststate;
        }
        public async Task<IViewComponentResult> InvokeAsync()
        {
            AppFooterViewModel data = new AppFooterViewModel();
            
            return View(data);
        }
    }
}
