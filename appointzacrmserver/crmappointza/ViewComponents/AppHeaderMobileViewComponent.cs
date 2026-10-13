using Microsoft.AspNetCore.Mvc;
using CrmAppointza.Models;
using CrmAppointza.Services;
using CrmAppointza.Utils;
using CrmAppointza.ViewModels;

namespace CrmAppointza.ViewComponents
{
    public class AppHeaderMobileViewComponent : ViewComponent
    {
        private RequestState _requestState;
        
        public AppHeaderMobileViewComponent(RequestState requestState)
        {
            _requestState = requestState;
            
        }
        public async Task<IViewComponentResult> InvokeAsync()
        {
            AppHeaderMobileViewModel data = new AppHeaderMobileViewModel();
            
            return View(data);
        }
    }
}
