# Sky Waters

Static website for Sky Waters, deployable on Vercel. The optional content manager uses Supabase for admin sign-in, saved website content, and image storage.

## Enable the admin content manager

The site works with its built-in content before Supabase is configured. To enable editing:

1. Create a Supabase project.
2. In **Authentication → Users**, create and confirm the admin user. Use a strong password.
3. Confirm the Supabase admin user uses `admin@skywaters.co.zw`, then run the complete `supabase/setup.sql` script in the Supabase SQL Editor.
4. In **Project Settings → API**, copy the Project URL and the public anon/publishable key into `backend-config.js`:

   ```js
   window.SKY_WATERS_BACKEND = {
     supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
     supabaseAnonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
   };
   ```

   The anon/publishable key is intended for browser use; never put a service-role or secret key in this file. The admin email is checked by Supabase and is not exposed in the public configuration.
5. Commit and push the configuration file, then deploy the repository on Vercel. No build command is needed for this static site.
6. Open `/login.html` on the deployed site and sign in with the Supabase admin account. The admin has separate files for `/dashboard.html`, `/home.html`, `/borehole.html`, `/auto-care.html`, `/general-services.html`, `/about.html`, `/work.html`, `/process.html`, `/contact.html`, and `/site-details.html`. The Dashboard and navigation link to each page. The admin header and navigation stay in place while the content area scrolls. Editable settings appear in horizontal rows on desktop and stack on mobile. Edit a page and select **Save changes**; saving a section preserves content in all the other sections. Lists use one item per line; images can be replaced by URL or uploaded, and removed with **Remove photo** and **Save changes**. Removing an image deletes its admin-uploaded file from Supabase Storage if no other saved field uses it; removal of the content is saved first, and a storage deletion error is reported if file removal fails. The previous `/admin.html` address redirects to sign-in.

The SQL policies allow public reads only. Only the authenticated admin email configured in `is_site_admin()` can change site content or upload images. Keep Supabase email confirmation enabled and protect the admin account with a unique password.

## Local preview

Run the site through a local HTTP server (for example, VS Code Live Server) so the browser can load `backend-config.js`, the content script, and the admin pages. Open `/login.html` to sign in. Before configuring Supabase, the public site uses its original built-in text and local images.
