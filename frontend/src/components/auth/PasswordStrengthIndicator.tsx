'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

export interface PasswordRules {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  score: number;
}

export const checkPasswordRules = (password: string): PasswordRules => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (minLength) score++;
  if (hasUppercase) score++;
  if (hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    isValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial,
    score,
  };
};

interface PasswordStrengthIndicatorProps {
  rules: PasswordRules;
  showDetails?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  rules,
  showDetails = true,
}) => {
  const getStrengthLabel = () => {
    if (rules.score === 0) return { label: 'Enter Password', color: 'bg-white/10', text: 'text-[#64748B]' };
    if (rules.score <= 2) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-400' };
    if (rules.score <= 4) return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-400' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' };
  };

  const strength = getStrengthLabel();

  return (
    <div className="space-y-2.5 pt-1">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[#94A3B8]">Password Strength</span>
          <span className={`font-medium ${strength.text}`}>{strength.label}</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 h-1.5">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`rounded-full transition-all duration-300 ${
                rules.score >= level ? strength.color : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rules Checklist */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
          <RuleItem satisfied={rules.minLength} label="8+ characters" />
          <RuleItem satisfied={rules.hasUppercase} label="Uppercase letter" />
          <RuleItem satisfied={rules.hasLowercase} label="Lowercase letter" />
          <RuleItem satisfied={rules.hasNumber} label="Number" />
          <div className="col-span-2">
            <RuleItem satisfied={rules.hasSpecial} label="Special character (!@#$%^&*)" />
          </div>
        </div>
      )}
    </div>
  );
};

const RuleItem: React.FC<{ satisfied: boolean; label: string }> = ({ satisfied, label }) => (
  <div className="flex items-center gap-1.5 text-[11px]">
    <div
      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors shrink-0 ${
        satisfied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-[#64748B] border border-white/10'
      }`}
    >
      {satisfied ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
    </div>
    <span className={satisfied ? 'text-[#F8FAFC]' : 'text-[#64748B]'}>{label}</span>
  </div>
);
