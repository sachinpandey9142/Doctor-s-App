import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Search } from "lucide-react-native";
import * as Contacts from "expo-contacts";

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (contactName: string, phoneNumber: string) => void;
}

export function ContactPickerModal({ visible, onClose, onSelect }: ContactPickerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName,
        });
        
        // Filter contacts with phone numbers
        const validContacts = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0 && c.name);
        setContacts(validContacts);
      }
    } catch (e) {
      console.log("Error loading contacts", e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Contacts.Contact }) => {
    const phoneNumber = item.phoneNumbers?.[0]?.number || "";
    
    return (
      <Pressable 
        style={[styles.contactRow, { borderBottomColor: theme.colors.border }]}
        onPress={() => onSelect(item.name || "Unknown", phoneNumber)}
      >
        <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
            {item.name ? item.name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.contactPhone, { color: theme.colors.textSecondary }]}>{phoneNumber}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Select Contact</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={{ color: theme.colors.textSecondary }}>No contacts found.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    padding: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 16,
    marginBottom: 4,
  },
  contactPhone: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
