REQOO CAMPAIGN PROMOTION FINAL

Replace these files:
1. shop/index.html
2. shop/promotion.html
3. shop/promotion-admin.html
4. Google Apps Script Code.gs

Campaign model:
- One campaign = one slug (example merdeka-special)
- Multiple rows with the same slug are products/items inside that campaign.
- Public page groups rows by slug.
- Shop ?promo=slug applies only that campaign.
- Admin can create a campaign then add multiple products to the same campaign.

After replacing Code.gs: Deploy > Manage deployments > Edit > New version > Deploy.
Keep the same /exec URL.
