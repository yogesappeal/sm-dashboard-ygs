# Get Bills
curl --location 'https://fvpxqvmmasnykwujcaen.supabase.co/functions/v1/bills?is_dummy=false&scope=approved_by_me' \
--header 'Authorization: Bearer {{bearer}}'

# Get Bill Detail
curl --location 'https://fvpxqvmmasnykwujcaen.supabase.co/functions/v1/bills/c1000000-0000-4000-8000-000000000001?is_dummy=false' \
--header 'Authorization: Bearer {{bearer}}'


# Get Bill Attachment
curl --location 'https://fvpxqvmmasnykwujcaen.supabase.co/functions/v1/bills/b1a2c3d4-0001-4000-8000-000000000001/attachments/a1a2c3d4-0000-4000-8000-000000000001' \
--header 'Authorization: Bearer {{bearer}}'

# Get Bill Activities
curl --location 'https://fvpxqvmmasnykwujcaen.supabase.co/functions/v1/bills/b1a2c3d4-0001-4000-8000-000000000001/activities' \
--header 'Authorization: Bearer {{bearer}}'


Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjQwYmY3NGEwLWMwMTYtNGVkOC05ODliLTUyZDU0MDY5NDM1NyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2Z2cHhxdm1tYXNueWt3dWpjYWVuLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4MWFhZTA1Yy1mNTkxLTQzZjctYTgyMC1hYjk5NWNjMTg2Y2MiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg4MTQ4NzE1LCJpYXQiOjE3ODgxNDUxMTUsImVtYWlsIjoieW9nZXMrdGVzdEBhcHBlYWwuYWkiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4ODE0NTExNX1dLCJzZXNzaW9uX2lkIjoiZTNiOGIzMGUtNTc3NS00NzRkLWExNDItM2VjZmY3MmM4NTFlIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.OpitqibCzG4Bj2iPkueD6Gd9-VfX8y6jr6Px1GYGSp4mC5E1pCC82p8yIK2HnzebQGG743mN_Sa7p73_WzUVmg