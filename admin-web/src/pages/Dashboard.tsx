import { useEffect, useState } from "react";
import { Users, Building2, LogOut, ShieldCheck, ShieldAlert, CheckCircle } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import api from "../api";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  hospital: string;
  isVerified: boolean;
  isBlocked: boolean;
  idDocument: string;
}

interface OrgStat {
  _id: string;
  count: number;
}

export function Dashboard() {
  const logout = useAdminStore((state) => state.logout);
  const adminUser = useAdminStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<"users" | "organizations">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<OrgStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "users") {
        const res = await api.get("/admin/users");
        setUsers(res.data.data);
      } else {
        const res = await api.get("/admin/organizations");
        setOrgs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await api.put(`/admin/users/${id}/verify`);
      setUsers(users.map(u => u._id === id ? { ...u, isVerified: true } : u));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockToggle = async (user: User) => {
    try {
      if (user.isBlocked) {
        await api.put(`/admin/users/${user._id}/unblock`);
        setUsers(users.map(u => u._id === user._id ? { ...u, isBlocked: false } : u));
      } else {
        await api.put(`/admin/users/${user._id}/block`);
        setUsers(users.map(u => u._id === user._id ? { ...u, isBlocked: true } : u));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>Doctor's App Admin</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Welcome, {adminUser?.name}</p>
        </div>
        <nav style={{ flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab("users")}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', 
              background: activeTab === "users" ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
              color: activeTab === "users" ? 'var(--primary)' : 'var(--text-primary)',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
            }}
          >
            <Users size={18} /> Manage Users
          </button>
          <button 
            onClick={() => setActiveTab("organizations")}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', 
              background: activeTab === "organizations" ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
              color: activeTab === "organizations" ? 'var(--primary)' : 'var(--text-primary)',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
            }}
          >
            <Building2 size={18} /> Organizations
          </button>
        </nav>
        <div style={{ padding: '16px' }}>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '10px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>
            {activeTab === "users" ? "User Management" : "Organization Statistics"}
          </h1>
        </div>

        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading data...</div>
          ) : activeTab === "users" ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Role & Hospital</th>
                    <th>ID Document</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{user.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{user.email}</div>
                      </td>
                      <td>
                        <div style={{ textTransform: 'capitalize' }}>{user.role}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.hospital || "No hospital specified"}</div>
                      </td>
                      <td>
                        {user.idDocument ? (
                          <a href={user.idDocument} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            View ID
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>Not provided</span>
                        )}
                      </td>
                      <td>
                        {user.isBlocked ? (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldAlert size={12} /> Blocked</span>
                        ) : user.isVerified ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={12} /> Verified</span>
                        ) : (
                          <span className="badge badge-warning">Pending</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!user.isVerified && !user.isBlocked && (
                            <button onClick={() => handleVerify(user._id)} className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--success)' }}>
                              <CheckCircle size={14} /> Verify
                            </button>
                          )}
                          <button 
                            onClick={() => handleBlockToggle(user)} 
                            className={`btn ${user.isBlocked ? '' : 'btn-danger'}`} 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            {user.isBlocked ? "Unblock" : "Block"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Organization / Hospital</th>
                    <th>Registered Professionals</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map(org => (
                    <tr key={org._id}>
                      <td style={{ fontWeight: '500' }}>{org._id}</td>
                      <td>
                        <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '13px' }}>
                          {org.count} Users
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orgs.length === 0 && (
                    <tr><td colSpan={2} style={{ textAlign: 'center', padding: '32px' }}>No organizations found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
