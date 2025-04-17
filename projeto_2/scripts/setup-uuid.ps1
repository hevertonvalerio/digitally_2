$env:PGPASSWORD = "gZ33eBHvoNJAaXCd90SzYhZ1tehUT386MJe56PsfroixeVZeuk"
psql -h vps.iaautomation.com.br -U postgres -d profile_admin -f scripts/setup-uuid.sql
