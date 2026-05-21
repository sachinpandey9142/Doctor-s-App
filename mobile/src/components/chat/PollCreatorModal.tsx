import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Plus, Trash2 } from "lucide-react-native";

interface PollCreatorModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (question: string, options: string[]) => void;
}

export function PollCreatorModal({ visible, onClose, onCreate }: PollCreatorModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (text: string, index: number) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    if (!question.trim()) return;
    const validOptions = options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) return;
    
    onCreate(question.trim(), validOptions);
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.content, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Create Poll</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Question</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="Ask a question..."
              placeholderTextColor={theme.colors.placeholder}
              value={question}
              onChangeText={setQuestion}
              autoFocus
            />

            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 24 }]}>Options</Text>
            {options.map((opt, idx) => (
              <View key={idx} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, styles.optionInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor={theme.colors.placeholder}
                  value={opt}
                  onChangeText={(text) => handleOptionChange(text, idx)}
                />
                {options.length > 2 && (
                  <Pressable onPress={() => handleRemoveOption(idx)} style={styles.removeBtn}>
                    <Trash2 size={20} color={theme.colors.error} />
                  </Pressable>
                )}
              </View>
            ))}

            {options.length < 5 && (
              <Pressable onPress={handleAddOption} style={styles.addBtn}>
                <Plus size={20} color={theme.colors.primary} />
                <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>Add Option</Text>
              </Pressable>
            )}
          </ScrollView>

          <Pressable 
            onPress={handleCreate}
            style={[styles.createBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.createBtnText}>Send Poll</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    height: "80%",
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  label: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  optionInput: {
    flex: 1,
  },
  removeBtn: {
    padding: 12,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  addBtnText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
    marginLeft: 8,
  },
  createBtn: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  createBtnText: {
    color: "#FFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
  },
});
