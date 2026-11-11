using TravelCRM.Api.Models;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);

    Task<bool> EmailExistsAsync(string email);

    Task<bool> RoleExistsAsync(int roleId);

    Task AddAsync(User user);

    Task SaveChangesAsync();
}
