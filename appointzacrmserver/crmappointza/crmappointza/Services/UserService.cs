using CrmAppointza.Models.CrmAppointza;
using CrmAppointza.Utils;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Data.Common;

namespace CrmAppointza.Services.CrmAppointza
{
    public class UserService
    {
        IDbProvider dbprovider;
        IQueryBuilderProvider querybuilderprovider;
        RequestState requeststate;
        CustomCryptography cryptography;

        public UserService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate,
            CustomCryptography cryptography)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
            this.cryptography = cryptography;
        }

        public async Task<List<User>> Select(UserSelectReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await SelectTransaction(db, req);
            }
        }

        public async Task<List<User>> SelectTransaction(IDb db, UserSelectReq req)
        {
            List<User> result = new List<User>();

            string query = @"
                SELECT
                    id, name, email, password_hash, role, organization_id
                FROM users
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (!string.IsNullOrEmpty(req.id))
                qb.AddParameter("id::text", "=", "id", req.id, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.organizationid))
                qb.AddParameter("organization_id::text", "=", "organizationid", req.organizationid, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.name))
                qb.AddParameter("name", "=", "name", req.name, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.email))
                qb.AddParameter("email", "=", "email", req.email, DbTypes.Types.String);
            if (!string.IsNullOrEmpty(req.role))
                qb.AddParameter("role", "=", "role", req.role, DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");

            var command = qb.GetCommand(db);

            using (DbDataReader reader = await db.Execute(command))
            {
                while (await reader.ReadAsync())
                {
                    User user = new User();
                    user.id = reader["id"] == DBNull.Value ? null : reader["id"]?.ToString();
                    user.name = reader["name"] == DBNull.Value ? null : reader["name"]?.ToString();
                    user.email = reader["email"] == DBNull.Value ? null : reader["email"]?.ToString();
                    user.passwordhash = reader["password_hash"] == DBNull.Value ? null : reader["password_hash"]?.ToString();
                    user.role = reader["role"] == DBNull.Value ? null : reader["role"]?.ToString();
                    user.organizationid = reader["organization_id"] == DBNull.Value ? null : reader["organization_id"]?.ToString();
                    result.Add(user);
                }
            }

            return result;
        }

        public async Task<User> Insert(User user)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await InsertTransaction(db, user);
            }
            return user;
        }

        public async Task InsertTransaction(IDb db, User user)
        {
            if (string.IsNullOrWhiteSpace(user.id))
                user.id = Guid.NewGuid().ToString();

            string query = @"
                INSERT INTO users (
                    id, name, email, password_hash, role, organization_id
                )
                VALUES (
                    @id::uuid, @name, @email, @password_hash, @role, @organization_id::uuid
                );
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(user.id) ? DBNull.Value : user.id;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)user.name ?? DBNull.Value;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = (object)user.email ?? DBNull.Value;
            db.AddParameter(cmd, "password_hash", DbTypes.Types.String).Value = (object)user.passwordhash ?? DBNull.Value;
            db.AddParameter(cmd, "role", DbTypes.Types.String).Value = (object)user.role ?? DBNull.Value;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(user.organizationid) ? DBNull.Value : user.organizationid;

            await db.ExecuteNonQuery(cmd);
        }

        public async Task<User> Update(User user)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                await UpdateTransaction(db, user);
            }
            return user;
        }

        public async Task<bool> UpdateTransaction(IDb db, User user)
        {
            string query = @"
                UPDATE users
                SET
                    name = @name,
                    email = @email,
                    password_hash = @password_hash,
                    role = @role,
                    organization_id = @organization_id::uuid
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(user.id) ? DBNull.Value : user.id;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = (object)user.name ?? DBNull.Value;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = (object)user.email ?? DBNull.Value;
            db.AddParameter(cmd, "password_hash", DbTypes.Types.String).Value = (object)user.passwordhash ?? DBNull.Value;
            db.AddParameter(cmd, "role", DbTypes.Types.String).Value = (object)user.role ?? DBNull.Value;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = string.IsNullOrWhiteSpace(user.organizationid) ? DBNull.Value : user.organizationid;

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(UserDeleteReq req)
        {
            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();
                return await DeleteTransaction(db, req);
            }
        }

        public async Task<bool> DeleteTransaction(IDb db, UserDeleteReq req)
        {
            string query = @"
                DELETE FROM users
                WHERE id = @id::uuid
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = req.id ?? "";

            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<UserLoginRes> Login(UserLoginReq req)
        {
            if (string.IsNullOrWhiteSpace(req.email) || string.IsNullOrWhiteSpace(req.password))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Email and password are required.");

            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();

                var user = await GetUserByEmail(db, req.email.Trim());
                if (user == null)
                    throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid email or password.");

                string passwordHash = cryptography.CalculateSHA256Hash(req.password);
                if (!string.Equals(user.passwordHash, passwordHash, StringComparison.OrdinalIgnoreCase))
                    throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid email or password.");

                if (!string.Equals(user.status, "active", StringComparison.OrdinalIgnoreCase))
                    throw new AppException(AppException.ErrorCodes.InvalidCredential, "User is not active.");

                var org = await GetOrganization(db, user.organizationId);

                string staffId = "";
                if (string.Equals(user.role, "staff", StringComparison.OrdinalIgnoreCase))
                {
                    var resolvedStaffId = await GetStaffIdByEmailAndOrg(db, user.email, user.organizationId);
                    if (!string.IsNullOrWhiteSpace(resolvedStaffId))
                        staffId = resolvedStaffId;
                }

                return new UserLoginRes
                {
                    userId = user.id,
                    email = user.email,
                    role = user.role,
                    organizationId = user.organizationId,
                    organizationName = org?.Name ?? "",
                    organizationSlug = org?.Slug ?? "",
                    staffId = staffId
                };
            }
        }

        public async Task<UserLoginRes> LoginWithMobile(UserMobileLoginReq req)
        {
            string mobile = NormalizeMobile(req.mobile);
            if (string.IsNullOrWhiteSpace(mobile) || string.IsNullOrWhiteSpace(req.password))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Mobile number and date of birth are required.");

            if (!TryNormalizeDobPassword(req.password, out string dobPassword))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Enter a valid date of birth.");

            using IDb db = await dbprovider.GetDb();
            await db.Connect();

            var user = await GetStudentUserByMobile(db, mobile, req.organizationid?.Trim());
            if (user == null)
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid mobile number or date of birth.");

            string passwordHash = cryptography.CalculateSHA256Hash(dobPassword);
            if (!string.Equals(user.passwordHash, passwordHash, StringComparison.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid mobile number or date of birth.");

            if (!string.Equals(user.status, "active", StringComparison.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "User is not active.");

            var org = await GetOrganization(db, user.organizationId);

            return new UserLoginRes
            {
                userId = user.id,
                email = user.email,
                role = user.role,
                organizationId = user.organizationId,
                organizationName = org?.Name ?? "",
                organizationSlug = org?.Slug ?? "",
                studentId = user.profileId,
                mobile = mobile
            };
        }

        public async Task<UserLoginRes> UpdateProfile(UserProfileUpdateReq req)
        {
            if (string.IsNullOrWhiteSpace(req.userId))
                throw new AppException(AppException.ErrorCodes.BadRequest, "User id is required.");
            if (string.IsNullOrWhiteSpace(req.currentPassword))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Current password is required.");

            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();

                var user = await GetUserById(db, req.userId.Trim());
                if (user == null)
                    throw new AppException(AppException.ErrorCodes.UserNotFound, "User not found.");

                string currentHash = cryptography.CalculateSHA256Hash(req.currentPassword);
                if (!string.Equals(user.passwordHash, currentHash, StringComparison.OrdinalIgnoreCase))
                    throw new AppException(AppException.ErrorCodes.InvalidCredential, "Current password is incorrect.");

                string targetEmail = user.email;
                if (!string.IsNullOrWhiteSpace(req.newEmail))
                {
                    targetEmail = req.newEmail.Trim();
                    if (targetEmail.Length < 3 || targetEmail.IndexOf('@') < 1)
                        throw new AppException(AppException.ErrorCodes.BadRequest, "Enter a valid email address.");
                    if (!targetEmail.Equals(user.email, StringComparison.OrdinalIgnoreCase)
                        && await EmailTakenByAnotherUser(db, targetEmail, user.id))
                    {
                        throw new AppException(AppException.ErrorCodes.BadRequest, "That email is already in use.");
                    }
                }

                string targetPasswordHash = user.passwordHash;
                if (!string.IsNullOrWhiteSpace(req.newPassword))
                {
                    if (req.newPassword.Length < 6)
                        throw new AppException(AppException.ErrorCodes.BadRequest, "New password must be at least 6 characters.");
                    targetPasswordHash = cryptography.CalculateSHA256Hash(req.newPassword);
                }

                string targetUsername = UsernameFromEmail(targetEmail);

                await UpdateUserProfileRow(db, user.id, targetEmail, targetUsername, targetPasswordHash);

                if (string.Equals(user.role, "staff", StringComparison.OrdinalIgnoreCase)
                    && !string.IsNullOrWhiteSpace(user.profileId))
                {
                    await SyncStaffEmail(db, user.profileId, user.organizationId, targetEmail);
                }

                var org = await GetOrganization(db, user.organizationId);
                string staffId = "";
                if (string.Equals(user.role, "staff", StringComparison.OrdinalIgnoreCase))
                {
                    var resolved = await GetStaffIdByEmailAndOrg(db, targetEmail, user.organizationId);
                    if (!string.IsNullOrWhiteSpace(resolved))
                        staffId = resolved;
                }

                return new UserLoginRes
                {
                    userId = user.id,
                    email = targetEmail,
                    role = user.role,
                    organizationId = user.organizationId,
                    organizationName = org?.Name ?? "",
                    organizationSlug = org?.Slug ?? "",
                    staffId = staffId
                };
            }
        }

        private sealed class UserRow
        {
            public string id { get; set; } = "";
            public string email { get; set; } = "";
            public string role { get; set; } = "";
            public string status { get; set; } = "";
            public string organizationId { get; set; } = "";
            public string passwordHash { get; set; } = "";
            public string profileId { get; set; } = "";
            public string username { get; set; } = "";
            public DateTime? otpExpiresAt { get; set; }
        }

        private static async Task<UserRow?> GetStudentUserByMobile(IDb db, string mobile, string organizationId)
        {
            string query = @"
                SELECT id, email, role, status, organization_id, password_hash, profile_id, username, otp_expires_at
                FROM users
                WHERE mobile = @mobile
                  AND role = 'student'
                  AND is_active = true
            ";
            if (!string.IsNullOrWhiteSpace(organizationId))
                query += " AND organization_id = @organization_id";
            query += " LIMIT 1;";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "mobile", DbTypes.Types.String).Value = mobile;
            if (!string.IsNullOrWhiteSpace(organizationId))
                db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = organizationId;

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                return MapUserRow(reader);
            return null;
        }

        private static async Task<UserRow?> GetUserByEmail(IDb db, string email)
        {
            string query = @"
                SELECT id, email, role, status, organization_id, password_hash, profile_id, username, otp_expires_at
                FROM users
                WHERE lower(email) = lower(@email)
                  AND is_active = true
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;

            using (var reader = await db.Execute(cmd))
            {
                if (await reader.ReadAsync())
                {
                    return MapUserRow(reader);
                }
            }

            return null;
        }

        private static async Task<UserRow?> GetUserById(IDb db, string userId)
        {
            string query = @"
                SELECT id, email, role, status, organization_id, password_hash, profile_id, username, otp_expires_at
                FROM users
                WHERE id = @id
                  AND is_active = true
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = userId;

            using (var reader = await db.Execute(cmd))
            {
                if (await reader.ReadAsync())
                    return MapUserRow(reader);
            }

            return null;
        }

        private static UserRow MapUserRow(DbDataReader reader)
        {
            DateTime? otpExpires = null;
            try
            {
                int idx = reader.GetOrdinal("otp_expires_at");
                if (reader[idx] != DBNull.Value)
                    otpExpires = Convert.ToDateTime(reader[idx]);
            }
            catch (IndexOutOfRangeException)
            {
                // Column may be missing before migration.
            }

            return new UserRow
            {
                id = reader["id"]?.ToString() ?? "",
                email = reader["email"]?.ToString() ?? "",
                role = reader["role"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                organizationId = reader["organization_id"]?.ToString() ?? "",
                passwordHash = reader["password_hash"]?.ToString() ?? "",
                profileId = reader["profile_id"]?.ToString() ?? "",
                username = reader["username"]?.ToString() ?? "",
                otpExpiresAt = otpExpires
            };
        }

        private static string UsernameFromEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return "";
            int at = email.IndexOf('@');
            string local = at > 0 ? email.Substring(0, at) : email;
            local = local.Trim().Replace(" ", "_", StringComparison.Ordinal);
            return local.Length > 0 ? local : email;
        }

        private static async Task<bool> EmailTakenByAnotherUser(IDb db, string email, string excludeUserId)
        {
            string query = @"
                SELECT id FROM users
                WHERE lower(email) = lower(@email)
                  AND id <> @exclude_id
                  AND is_active = true
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "exclude_id", DbTypes.Types.String).Value = excludeUserId;

            using (var reader = await db.Execute(cmd))
            {
                return await reader.ReadAsync();
            }
        }

        private static async Task UpdateUserProfileRow(IDb db, string userId, string email, string username, string passwordHash)
        {
            string query = @"
                UPDATE users
                SET email = @email,
                    username = @username,
                    password_hash = @password_hash,
                    updated_at = @updated_at
                WHERE id = @id
                  AND is_active = true;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = userId;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "username", DbTypes.Types.String).Value = username ?? "";
            db.AddParameter(cmd, "password_hash", DbTypes.Types.String).Value = passwordHash ?? "";
            db.AddParameter(cmd, "updated_at", DbTypes.Types.DateTime).Value = DateTime.UtcNow;

            await db.ExecuteNonQuery(cmd);
        }

        private static async Task SyncStaffEmail(IDb db, string staffId, string organizationId, string email)
        {
            if (string.IsNullOrWhiteSpace(staffId) || string.IsNullOrWhiteSpace(organizationId))
                return;

            string query = @"
                UPDATE staff
                SET email = @email,
                    updated_at = @updated_at
                WHERE staff_id = @staff_id
                  AND organization_id = @organization_id
                  AND is_active = true;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email.Trim();
            db.AddParameter(cmd, "staff_id", DbTypes.Types.String).Value = staffId;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = organizationId;
            db.AddParameter(cmd, "updated_at", DbTypes.Types.DateTime).Value = DateTime.UtcNow;

            await db.ExecuteNonQuery(cmd);
        }

        private static async Task<(string Name, string Slug)?> GetOrganization(IDb db, string organizationId)
        {
            if (string.IsNullOrWhiteSpace(organizationId))
                return null;

            string query = @"
                SELECT name, slug
                FROM organizations
                WHERE id = @id
                  AND is_active = true
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = organizationId;

            using (var reader = await db.Execute(cmd))
            {
                if (await reader.ReadAsync())
                {
                    return (
                        reader["name"]?.ToString() ?? "",
                        reader["slug"]?.ToString() ?? ""
                    );
                }
            }

            return null;
        }

        private static async Task<string?> GetStaffIdByEmailAndOrg(IDb db, string email, string organizationId)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(organizationId))
                return null;

            string query = @"
                SELECT staff_id
                FROM staff
                WHERE lower(email) = lower(@email)
                  AND organization_id = @organization_id
                  AND is_active = true
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = organizationId;

            using (var reader = await db.Execute(cmd))
            {
                if (await reader.ReadAsync())
                {
                    var id = reader["staff_id"]?.ToString();
                    if (!string.IsNullOrWhiteSpace(id))
                        return id;
                }
            }

            return null;
        }

        private static string NormalizeMobile(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return "";

            string digits = Regex.Replace(phone, @"\D", "");
            if (digits.Length >= 10)
                return digits[^10..];
            return digits;
        }

        private static string FormatDobPassword(DateTime dob)
        {
            return dob.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        private static bool TryNormalizeDobPassword(string? input, out string normalized)
        {
            normalized = "";
            if (string.IsNullOrWhiteSpace(input))
                return false;

            string trimmed = input.Trim();
            string[] formats =
            {
                "yyyy-MM-dd",
                "dd-MM-yyyy",
                "dd/MM/yyyy",
                "d-M-yyyy",
                "d/M/yyyy",
            };

            if (DateTime.TryParseExact(trimmed, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime parsed)
                || DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
            {
                if (parsed.Year < 1900)
                    return false;
                normalized = FormatDobPassword(parsed);
                return true;
            }

            return false;
        }
    }
}
