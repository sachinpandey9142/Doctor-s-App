import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, Switch, Linking } from "react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShieldCheck, ShieldAlert, Building2, Users } from "lucide-react-native";

import { apiClient } from "@/services/api/client";
import { getAdminUsersRequest, getOrganizationsRequest, verifyAdminUserRequest, blockAdminUserRequest, unblockAdminUserRequest } from "@/services/api/adminApi";
import { AnimatedButton } from "@/components/common/AnimatedButton";

type Tab = "Users" | "Organizations";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  isBlocked: boolean;
  idDocument: string;
}

export function AdminPanelScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("Users");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const users = await getAdminUsersRequest();
      setUsers(users as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const orgs = await getOrganizationsRequest();
      setOrgs(orgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "Users") {
      void fetchUsers();
    } else {
      void fetchOrgs();
    }
  }, [tab]);

  const toggleVerify = async (id: string, currentVerified: boolean) => {
    if (currentVerified) return; // For simplicity, only allow verifying, not un-verifying
    try {
      await verifyAdminUserRequest(id);
      setUsers(users.map((u) => (u._id === id ? { ...u, isVerified: true } : u)));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleBlock = async (id: string, currentBlocked: boolean) => {
    try {
      if (currentBlocked) {
        await unblockAdminUserRequest(id);
        setUsers(users.map((u) => (u._id === id ? { ...u, isBlocked: false } : u)));
      } else {
        await blockAdminUserRequest(id);
        setUsers(users.map((u) => (u._id === id ? { ...u, isBlocked: true } : u)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <Text style={[styles.header, { color: theme.colors.textPrimary }]}>Platform Administration</Text>

      <View style={styles.tabRow}>
        <AnimatedButton
          title="Users"
          variant={tab === "Users" ? "primary" : "ghost"}
          onPress={() => setTab("Users")}
          style={styles.tabBtn}
          icon={<Users size={16} color={tab === "Users" ? "#FFF" : theme.colors.primary} />}
        />
        <AnimatedButton
          title="Orgs"
          variant={tab === "Organizations" ? "primary" : "ghost"}
          onPress={() => setTab("Organizations")}
          style={styles.tabBtn}
          icon={<Building2 size={16} color={tab === "Organizations" ? "#FFF" : theme.colors.primary} />}
        />
      </View>

      {tab === "Users" && (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          refreshing={loading}
          onRefresh={fetchUsers}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>{item.email}</Text>
                </View>
                {item.isBlocked ? (
                  <ShieldAlert size={20} color={theme.colors.error} />
                ) : item.isVerified ? (
                  <ShieldCheck size={20} color={theme.colors.success} />
                ) : null}
              </View>

              {item.idDocument ? (
                <Text
                  style={[styles.link, { color: theme.colors.primary }]}
                  onPress={() => Linking.openURL(item.idDocument)}
                >
                  View ID Document
                </Text>
              ) : (
                <Text style={[styles.cardSub, { color: theme.colors.textSecondary, fontStyle: "italic" }]}>No ID Provided</Text>
              )}

              <View style={styles.actions}>
                <View style={styles.actionSwitch}>
                  <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Verified</Text>
                  <Switch
                    value={item.isVerified}
                    onValueChange={() => toggleVerify(item._id, item.isVerified)}
                    disabled={item.isVerified}
                    trackColor={{ true: theme.colors.success }}
                  />
                </View>
                <View style={styles.actionSwitch}>
                  <Text style={[styles.actionLabel, { color: theme.colors.error }]}>Blocked</Text>
                  <Switch
                    value={item.isBlocked}
                    onValueChange={() => toggleBlock(item._id, item.isBlocked)}
                    trackColor={{ true: theme.colors.error }}
                  />
                </View>
              </View>
            </View>
          )}
        />
      )}

      {tab === "Organizations" && (
        <FlatList
          data={orgs}
          keyExtractor={(item) => item._id}
          refreshing={loading}
          onRefresh={fetchOrgs}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{item._id}</Text>
              <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>Users: {item.count}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 24, fontFamily: "SpaceGrotesk_700Bold", marginHorizontal: 16, marginVertical: 12 },
  tabRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, gap: 10 },
  tabBtn: { flex: 1 },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold" },
  cardSub: { fontSize: 13, fontFamily: "Manrope_500Medium", marginTop: 2 },
  link: { fontSize: 14, fontFamily: "Manrope_700Bold", textDecorationLine: "underline" },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(150,150,150,0.2)" },
  actionSwitch: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionLabel: { fontSize: 14, fontFamily: "Manrope_500Medium" }
});
