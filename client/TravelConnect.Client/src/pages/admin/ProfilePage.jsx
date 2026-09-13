import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Camera, Lock, Save, User, Mail, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const EXTRAS_KEY = "tc_profile_extras";

function loadExtras() {
  try {
    const raw = localStorage.getItem(EXTRAS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ProfilePage() {
  const { role } = useOutletContext();
  const { user, updateProfile } = useAuth();

  const nameParts = (user?.name || "").split(/\s+/).filter(Boolean);
  const [profile, setProfile] = useState(() => {
    const extras = loadExtras();
    return {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: user?.email || "",
      phone: extras.phone || "",
      address: extras.address || "",
      company: extras.company || "",
      jobTitle: extras.jobTitle || "",
    };
  });
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [saved, setSaved] = useState(false);

  const handleProfileChange = (e) => {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    if (name) updateProfile({ name });
    localStorage.setItem(
      EXTRAS_KEY,
      JSON.stringify({
        phone: profile.phone,
        address: profile.address,
        company: profile.company,
        jobTitle: profile.jobTitle,
      })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const initials = (profile.firstName[0] || "") + (profile.lastName[0] || "");

  return (
    <div>
      {/* Header */}
      <section className="mb-8">
        <p className="text-cyan-accent font-medium text-sm">{role}</p>
        <h1 className="text-3xl font-black mt-1">My Profile</h1>
        <p className="text-text-secondary mt-2">
          Manage your account information and preferences.
        </p>
      </section>

      {/* Success Notice */}
      {saved && (
        <div className="mb-6 rounded-xl border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green">
          Profile saved successfully. The sidebar now reflects your updated name.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar Card */}
        <div className="card flex flex-col items-center text-center">
          <div className="relative">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-cyan-accent/20 flex items-center justify-center text-cyan-accent text-3xl font-black">
                {initials.toUpperCase() || "?"}
              </div>
            )}
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center text-text-secondary hover:bg-navy-600 transition">
              <Camera size={14} />
            </button>
          </div>
          <h2 className="text-lg font-bold mt-4">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-cyan-accent text-sm">{role}</p>
          <p className="text-text-secondary text-xs mt-1">{profile.email}</p>

          <div className="w-full mt-6 pt-6 border-t border-navy-700 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary flex items-center gap-1.5">
                <Mail size={13} /> Sign-in email
              </span>
              <span className="font-medium truncate max-w-48">{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary flex items-center gap-1.5">
                <Shield size={13} /> Account role
              </span>
              <span className="font-medium">{role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Department</span>
              <span className="font-medium">{profile.company ? profile.company : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Job title</span>
              <span className="font-medium">{profile.jobTitle || "—"}</span>
            </div>
            {user?.role !== "Customer" && (
              <div className="pt-3 mt-3 border-t border-navy-700 rounded-lg bg-cyan-accent/5 px-3 py-2 text-xs text-text-secondary text-left">
                Changes here update the name shown in the admin sidebar and header instantly.
              </div>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-accent/15 flex items-center justify-center text-cyan-accent">
                <User size={18} />
              </div>
              <div>
                <h2 className="font-bold">Personal Information</h2>
                <p className="text-sm text-text-secondary">
                  Update your personal details
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-xs text-text-secondary">
                First Name
                <input
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  className="mt-2 input-field"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                Last Name
                <input
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  className="mt-2 input-field"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                Email Address
                <input
                  name="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-2 input-field !text-text-secondary !cursor-not-allowed"
                />
                <span className="mt-1 block text-[11px] text-text-secondary">
                  Email is tied to your sign-in account and can't be changed here.
                </span>
              </label>
              <label className="block text-xs text-text-secondary">
                Phone Number
                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  className="mt-2 input-field"
                />
              </label>
              <label className="block text-xs text-text-secondary sm:col-span-2">
                Address
                <input
                  name="address"
                  value={profile.address}
                  onChange={handleProfileChange}
                  className="mt-2 input-field"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                Company
                <input
                  name="company"
                  value={profile.company}
                  onChange={handleProfileChange}
                  className="mt-2 input-field"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                Job Title
                <input
                  name="jobTitle"
                  value={profile.jobTitle}
                  onChange={handleProfileChange}
                  className="mt-2 input-field"
                />
              </label>
            </div>

            <div className="flex justify-end mt-6">
              <button type="submit" className="btn-primary">
                <Save size={16} /> Save Changes
              </button>
            </div>
          </form>

          {/* Password Change */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-badge-orange/15 flex items-center justify-center text-badge-orange">
                <Lock size={18} />
              </div>
              <div>
                <h2 className="font-bold">Change Password</h2>
                <p className="text-sm text-text-secondary">
                  Update your account password
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <label className="block text-xs text-text-secondary">
                Current Password
                <input
                  name="current"
                  type="password"
                  value={passwords.current}
                  onChange={handlePasswordChange}
                  className="mt-2 input-field"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                New Password
                <input
                  name="new"
                  type="password"
                  value={passwords.new}
                  onChange={handlePasswordChange}
                  className="mt-2 input-field"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                Confirm Password
                <input
                  name="confirm"
                  type="password"
                  value={passwords.confirm}
                  onChange={handlePasswordChange}
                  className="mt-2 input-field"
                />
              </label>
            </div>

            <div className="flex justify-end mt-6">
              <button className="btn-primary">
                <Lock size={16} /> Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}