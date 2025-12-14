-- Reset All Users to Free State
-- This deletes all plan entries. The app will automatically create a new 'free' plan 
-- when the user next logs in or refreshes the page (via create_default_user_plan).

DELETE FROM public.user_plans;

-- Optional: If you want to force a specific user to free without deleting (though delete is cleaner for reset):
-- UPDATE public.user_plans SET plan = 'free', status = 'active' WHERE user_id = 'USER_UUID';
