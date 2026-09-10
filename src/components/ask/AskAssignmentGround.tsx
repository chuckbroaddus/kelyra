import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormSheet } from '@/components/ui/FormSheet';
import { ListRow } from '@/components/ui/ListRow';
import { type } from '@/constants/theme';
import {
  clearAskAssignmentGround,
  consumeTrayHintOnce,
  getAskParentChildId,
  isAskJustChatting,
  peekAskPageGround,
  setAskJustChatting,
  setAskParentChildId,
  setAskSessionGround,
  studentSoftGroundChip,
  type AskAssignmentGround,
} from '@/lib/ask/assignmentGround';
import { loadParentProgressMine } from '@/lib/parents/api';
import { listTutorBriefGroundOptions } from '@/lib/tutorBrief/api';
import type { TutorBriefGroundOption } from '@/lib/tutorBrief/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  role: string;
  classId: string | null;
  studentId: string | null;
  onGroundChange?: (ground: AskAssignmentGround | null) => void;
};

/** A-Filing student chip / parent empty card above MessageComposer. */
export function AskAssignmentGroundChrome({ role, classId, studentId, onGroundChange }: Props) {
  const { colors } = useTheme();
  const [chip, setChip] = useState<AskAssignmentGround | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [options, setOptions] = useState<TutorBriefGroundOption[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [trayHint, setTrayHint] = useState(false);
  const [parentChildId, setParentChildId] = useState<string | null>(
    () => studentId ?? getAskParentChildId(),
  );
  const [justChatting, setJustChatting] = useState(isAskJustChatting());
  const prevParentChildRef = useRef<string | null | undefined>(undefined);
  const prevClassIdRef = useRef<string | null | undefined>(undefined);

  // Parent: prefer prop (Ask focus sync) over stale local id.
  const boundStudentId = role === 'student' ? studentId : (studentId ?? parentChildId);

  const refreshChip = useCallback(() => {
    if (role === 'student') {
      setChip(studentSoftGroundChip());
    } else if (role === 'parent') {
      const session = studentSoftGroundChip();
      setChip(session?.source === 'page' ? null : session);
    } else {
      setChip(null);
    }
    setJustChatting(isAskJustChatting());
  }, [role]);

  useEffect(() => {
    refreshChip();
  }, [refreshChip]);

  // ASK-P1-05: on real child-id change, clear local chip and show Which assignment? again.
  useEffect(() => {
    if (role !== 'parent') return;
    const next = studentId ?? getAskParentChildId();
    const prev = prevParentChildRef.current;
    prevParentChildRef.current = next;
    setParentChildId(next);
    if (prev !== undefined && prev !== next) {
      setChip(null);
      setJustChatting(false);
      setCorrecting(false);
      setSheetOpen(false);
      onGroundChange?.(null);
    }
  }, [role, studentId, onGroundChange]);

  // MULT-01 / IQG-CL-01..03: classId change refreshes chip/card (module clear is in setActiveClassId).
  useEffect(() => {
    const prev = prevClassIdRef.current;
    prevClassIdRef.current = classId;
    if (prev !== undefined && prev !== classId) {
      setChip(null);
      setJustChatting(false);
      setCorrecting(false);
      setSheetOpen(false);
      onGroundChange?.(null);
      refreshChip();
    }
  }, [classId, onGroundChange, refreshChip]);

  useEffect(() => {
    if (role !== 'parent') return;
    let live = true;
    void loadParentProgressMine()
      .then((progress) => {
        if (!live || !progress) return;
        const kids = progress.children;
        if (kids.length === 1) {
          const only = kids[0]!.student_id;
          setAskParentChildId(only);
          setParentChildId(only);
          prevParentChildRef.current = only;
        } else if (kids.length > 1) {
          const current = studentId ?? getAskParentChildId();
          if (current && kids.some((k) => k.student_id === current)) {
            setParentChildId(current);
          } else if (!current) {
            // Twins fail closed until Family child switcher binds one.
            setAskParentChildId(null);
            setParentChildId(null);
            prevParentChildRef.current = null;
          }
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [role, studentId]);

  useEffect(() => {
    if (role !== 'student') return;
    if (peekAskPageGround() || studentSoftGroundChip() || isAskJustChatting()) return;
    if (consumeTrayHintOnce()) setTrayHint(true);
  }, [role]);

  const loadOptions = useCallback(async () => {
    if (role === 'parent' && !boundStudentId) {
      setOptions([]);
      return;
    }
    try {
      const rows = await listTutorBriefGroundOptions({
        studentId: boundStudentId,
        classId,
      });
      setOptions(rows);
    } catch {
      setOptions([]);
    }
  }, [boundStudentId, classId, role]);

  const pick = (row: TutorBriefGroundOption | null) => {
    if (!row) {
      setAskJustChatting();
      setChip(null);
      setJustChatting(true);
      onGroundChange?.(null);
    } else {
      const next: AskAssignmentGround = {
        assignmentId: row.assignment_id,
        title: row.title,
        source: role === 'parent' ? 'explicit' : 'picker',
      };
      setAskSessionGround(next);
      setChip(next);
      setJustChatting(false);
      onGroundChange?.(next);
    }
    setCorrecting(false);
    setSheetOpen(false);
    setTrayHint(false);
  };

  const startCorrect = async () => {
    await loadOptions();
    setCorrecting(true);
    // Ambiguous two or >3 → sheet; ≤3 inline (after load).
  };

  useEffect(() => {
    if (!correcting) return;
    if (options.length === 2 || options.length > 3) {
      setSheetOpen(true);
    }
  }, [correcting, options.length]);

  const showParentCard =
    role === 'parent' && !chip && !justChatting && Boolean(boundStudentId);

  useEffect(() => {
    if (showParentCard) void loadOptions();
  }, [showParentCard, loadOptions]);

  if (role !== 'student' && role !== 'parent') return null;

  const inlineOptions =
    correcting && role === 'student' && options.length > 0 && options.length <= 3 && options.length !== 2
      ? options
      : null;

  return (
    <View style={styles.wrap}>
      {role === 'student' && chip ? (
        <View style={[styles.chipRow, { backgroundColor: colors.elevated, borderColor: colors.line }]}>
          <Text
            style={[type.meta, { color: colors.ink, flex: 1 }]}
            accessibilityLabel={`Looks like ${chip.title}. Double-tap to change assignment.`}
          >
            Looks like {chip.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not this"
            onPress={() => void startCorrect()}
            hitSlop={8}
          >
            <Text style={[type.meta, { color: colors.brand }]}>Not this</Text>
          </Pressable>
        </View>
      ) : null}

      {role === 'student' && trayHint && !chip ? (
        <Pressable
          onPress={() => {
            setTrayHint(false);
            void startCorrect();
          }}
        >
          <Text style={[type.meta, { color: colors.mute }]}>Working on a specific assignment?</Text>
        </Pressable>
      ) : null}

      {inlineOptions ? (
        <View style={styles.inlineList}>
          {inlineOptions.map((row) => (
            <Pressable key={row.assignment_id} onPress={() => pick(row)}>
              <Text style={[type.body, { color: colors.ink }]}>{row.title}</Text>
            </Pressable>
          ))}
          <GhostButton label="Just chatting" align="left" onPress={() => pick(null)} />
        </View>
      ) : null}

      {showParentCard ? (
        <Card>
          <Text style={[type.section, { color: colors.ink }]}>Which assignment?</Text>
          <Text style={[type.body, { color: colors.mute }]}>
            Pick one so Ask can help with that work — or just chat.
          </Text>
          {options.map((row) => (
            <ListRow
              key={row.assignment_id}
              title={row.title}
              status={row.class_name || undefined}
              chevron={false}
              onPress={() => pick(row)}
            />
          ))}
          <GhostButton label="Just chatting" align="left" onPress={() => pick(null)} />
        </Card>
      ) : null}

      {role === 'parent' && !boundStudentId && !justChatting ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          Pick a child on Home first, then choose an assignment here.
        </Text>
      ) : null}

      <FormSheet
        visible={sheetOpen}
        title="Which assignment?"
        onClose={() => {
          setSheetOpen(false);
          setCorrecting(false);
        }}
      >
        {options.map((row) => (
          <ListRow
            key={row.assignment_id}
            title={row.title}
            status={row.class_name || undefined}
            chevron={false}
            onPress={() => pick(row)}
          />
        ))}
        <GhostButton label="Just chatting" align="left" onPress={() => pick(null)} />
      </FormSheet>
    </View>
  );
}

/** Clear ground when leaving Ask if desired — optional. */
export function resetAskGroundOnNewChat(): void {
  clearAskAssignmentGround();
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingBottom: 8 },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineList: { gap: 6 },
});
