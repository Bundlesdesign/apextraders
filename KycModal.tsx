import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  ShieldCheck,
  Upload,
  Camera,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Clock,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';

export const KycModal: React.FC = () => {
  const { user, kycModalOpen, setKycModalOpen, submitKyc, setActiveView } = useTrading();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [legalFirstName, setLegalFirstName] = useState('');
  const [legalLastName, setLegalLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('United States');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [idType, setIdType] = useState<'passport' | 'drivers_license' | 'national_id'>('passport');
  const [idNumber, setIdNumber] = useState('');
  const [idFrontImage, setIdFrontImage] = useState<string>('');
  const [idBackImage, setIdBackImage] = useState<string>('');
  const [selfieImage, setSelfieImage] = useState<string>('');

  // Pre-fill from existing submission if resubmission is required
  useEffect(() => {
    if (user?.kycSubmission) {
      const s = user.kycSubmission;
      setLegalFirstName(s.legalFirstName || '');
      setLegalLastName(s.legalLastName || '');
      setDateOfBirth(s.dateOfBirth || '');
      setCountry(s.country || 'United States');
      setResidentialAddress(s.residentialAddress || '');
      setCity(s.city || '');
      setStateOrProvince(s.stateOrProvince || '');
      setPostalCode(s.postalCode || '');
      setIdType(s.idType || 'passport');
      setIdNumber(s.idNumber || '');
      if (s.idFrontImage) setIdFrontImage(s.idFrontImage);
      if (s.idBackImage) setIdBackImage(s.idBackImage);
      if (s.selfieImage) setSelfieImage(s.selfieImage);
    } else if (user?.displayName) {
      const parts = user.displayName.split(' ');
      setLegalFirstName(parts[0] || '');
      setLegalLastName(parts.slice(1).join(' ') || '');
    }
  }, [user]);

  if (!kycModalOpen || !user) return null;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalFirstName.trim() || !legalLastName.trim() || !dateOfBirth || !residentialAddress.trim() || !city.trim()) {
      setError('Please fill in all required personal identification fields.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) {
      setError('Please enter your government document identification number.');
      return;
    }
    if (!idFrontImage) {
      setError('Please upload a clear copy of your government ID front.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleNextStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfieImage) {
      setError('Please upload or capture a biometric verification selfie.');
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await submitKyc({
        legalFirstName: legalFirstName.trim(),
        legalLastName: legalLastName.trim(),
        dateOfBirth,
        country,
        residentialAddress: residentialAddress.trim(),
        city: city.trim(),
        stateOrProvince: stateOrProvince.trim(),
        postalCode: postalCode.trim(),
        idType,
        idNumber: idNumber.trim(),
        idFrontImage,
        idBackImage,
        selfieImage,
      });
      setIsSubmitting(false);
      setStep(1);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const isApproved = user.kycStatus === 'approved';
  const isPending = user.kycStatus === 'pending';
  const isRejected = user.kycStatus === 'rejected';
  const isResubmission = user.kycStatus === 'resubmission_required';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#17191B]/80 flex items-center justify-center p-4 select-none">
      <div className="bg-[#FFFFFF] border border-[#17191B] max-w-2xl w-full shadow-none overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#17191B] text-[#F4F1EA] px-6 py-4 flex items-center justify-between border-b border-[#34383B]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#34383B] border border-[#9B8055]/40 flex items-center justify-center text-[#9B8055]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#9B8055] uppercase font-bold block">
                COMPLIANCE & AML VERIFICATION
              </span>
              <h2 className="font-editorial text-xl text-[#F4F1EA]">Tier-2 Identity Verification Dossier</h2>
            </div>
          </div>
          <button
            onClick={() => setKycModalOpen(false)}
            className="p-1 text-[#B7B1A6] hover:text-[#F4F1EA] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Status Displays */}
        {isApproved ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-[#17191B] text-[#9B8055] border border-[#9B8055]/50 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-editorial text-2xl text-[#17191B]">Tier-2 Institutional Verification Active</h3>
              <p className="text-xs text-[#34383B] mt-1 max-w-md mx-auto font-interface">
                Your identity dossier has been fully approved by the X-FUNDS Compliance & Clearing Desk.
                Unrestricted wire disbursements and electronic settlements are active.
              </p>
            </div>
            <div className="bg-[#F4F1EA] border border-[#B7B1A6]/40 p-4 text-left max-w-md mx-auto text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-[#34383B]">Legal Entity / Name:</span>
                <span className="font-bold text-[#17191B]">
                  {user.kycSubmission?.legalFirstName} {user.kycSubmission?.legalLastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#34383B]">Identification Type:</span>
                <span className="font-bold text-[#17191B] uppercase">
                  {user.kycSubmission?.idType?.replace('_', ' ') || 'Government ID'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#34383B]">Clearance Status:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                  APPROVED & CLEARED
                </span>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setKycModalOpen(false)}
                className="px-6 py-2.5 bg-[#17191B] hover:bg-[#34383B] text-[#F4F1EA] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Return to Platform
              </button>
            </div>
          </div>
        ) : isPending ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-[#17191B] text-[#9B8055] border border-[#9B8055]/50 mx-auto flex items-center justify-center">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="font-editorial text-2xl text-[#17191B]">Identity Dossier Under Formal Audit</h3>
              <p className="text-xs text-[#34383B] mt-1 max-w-md mx-auto font-interface leading-relaxed">
                Your credentials and identification documents have been safely logged and are undergoing audit
                review by our institutional compliance team.
              </p>
            </div>
            <div className="bg-[#F4F1EA] border border-[#B7B1A6]/40 p-4 text-left max-w-md mx-auto text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-[#17191B] font-bold">
                <ShieldCheck className="w-4 h-4 text-[#9B8055]" />
                Compliance Audit Queue Status
              </div>
              <p className="text-[#34383B] text-[11px] font-interface">
                Standard review turnaround is between 2 to 4 business hours. Wire disbursements will unlock
                automatically upon compliance approval.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setKycModalOpen(false)}
                className="px-6 py-2.5 bg-[#17191B] hover:bg-[#34383B] text-[#F4F1EA] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        ) : (
          /* Submission / Resubmission Form */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Context Banners */}
            {isRejected && (
              <div className="bg-rose-50 border border-rose-300 p-4 flex items-start gap-3 text-xs text-rose-900">
                <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Prior Submission Declined by Compliance</div>
                  <p className="mt-0.5 text-rose-800">
                    Reason: {user.kycSubmission?.rejectionReason || 'Document could not be verified.'}
                  </p>
                  <p className="mt-1 text-[11px] text-rose-700 font-mono">Please provide updated, legible identity documentation.</p>
                </div>
              </div>
            )}

            {isResubmission && (
              <div className="bg-[#F4F1EA] border border-[#9B8055] p-4 flex items-start gap-3 text-xs text-[#17191B]">
                <RotateCcw className="w-5 h-5 text-[#9B8055] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold uppercase tracking-wider font-mono text-[11px] text-[#9B8055]">Compliance Resubmission Notice</div>
                  <p className="mt-0.5 text-[#34383B] font-interface">
                    Instructions: {user.kycSubmission?.resubmissionInstructions || 'Please provide higher-resolution identity documents.'}
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Indicator */}
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/30 pb-4 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 text-[11px] font-bold flex items-center justify-center ${
                    step >= 1 ? 'bg-[#17191B] text-[#F4F1EA]' : 'bg-[#F4F1EA] text-[#34383B]'
                  }`}
                >
                  1
                </span>
                <span className={`text-[11px] uppercase tracking-wider ${step >= 1 ? 'text-[#17191B] font-bold' : 'text-[#34383B]'}`}>
                  Personal Info
                </span>
              </div>
              <div className="w-6 h-px bg-[#B7B1A6]/40" />
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 text-[11px] font-bold flex items-center justify-center ${
                    step >= 2 ? 'bg-[#17191B] text-[#F4F1EA]' : 'bg-[#F4F1EA] text-[#34383B]'
                  }`}
                >
                  2
                </span>
                <span className={`text-[11px] uppercase tracking-wider ${step >= 2 ? 'text-[#17191B] font-bold' : 'text-[#34383B]'}`}>
                  Document Upload
                </span>
              </div>
              <div className="w-6 h-px bg-[#B7B1A6]/40" />
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 text-[11px] font-bold flex items-center justify-center ${
                    step >= 3 ? 'bg-[#17191B] text-[#F4F1EA]' : 'bg-[#F4F1EA] text-[#34383B]'
                  }`}
                >
                  3
                </span>
                <span className={`text-[11px] uppercase tracking-wider ${step >= 3 ? 'text-[#17191B] font-bold' : 'text-[#34383B]'}`}>
                  Biometric Selfie
                </span>
              </div>
              <div className="w-6 h-px bg-[#B7B1A6]/40" />
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 text-[11px] font-bold flex items-center justify-center ${
                    step >= 4 ? 'bg-[#17191B] text-[#F4F1EA]' : 'bg-[#F4F1EA] text-[#34383B]'
                  }`}
                >
                  4
                </span>
                <span className={`text-[11px] uppercase tracking-wider ${step >= 4 ? 'text-[#17191B] font-bold' : 'text-[#34383B]'}`}>
                  Attestation
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Personal Details */}
            {step === 1 && (
              <form onSubmit={handleNextStep1} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Legal First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={legalFirstName}
                      onChange={e => setLegalFirstName(e.target.value)}
                      placeholder="e.g. Alexander"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Legal Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={legalLastName}
                      onChange={e => setLegalLastName(e.target.value)}
                      placeholder="e.g. Vance"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={e => setDateOfBirth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Country of Primary Residence <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    >
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Switzerland">Switzerland</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Germany">Germany</option>
                      <option value="Australia">Australia</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Residential Street Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={residentialAddress}
                    onChange={e => setResidentialAddress(e.target.value)}
                    placeholder="e.g. 100 Financial Center Blvd, Suite 400"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="e.g. New York"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      State / Province
                    </label>
                    <input
                      type="text"
                      value={stateOrProvince}
                      onChange={e => setStateOrProvince(e.target.value)}
                      placeholder="e.g. NY"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      placeholder="e.g. 10005"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    Continue to Document Upload
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Government ID Upload */}
            {step === 2 && (
              <form onSubmit={handleNextStep2} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Identification Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={idType}
                      onChange={e => setIdType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    >
                      <option value="passport">Passport</option>
                      <option value="drivers_license">Driver's License</option>
                      <option value="national_id">National Identity Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Identification Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={idNumber}
                      onChange={e => setIdNumber(e.target.value)}
                      placeholder="e.g. A98234190"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Upload Front Image */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Front of Document <span className="text-rose-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center transition-colors bg-slate-50/50">
                    {idFrontImage ? (
                      <div className="space-y-2">
                        <img
                          src={idFrontImage}
                          alt="ID Front Preview"
                          className="max-h-40 mx-auto rounded-lg border border-slate-200 object-contain shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setIdFrontImage('')}
                          className="text-[11px] text-rose-600 hover:underline cursor-pointer font-medium"
                        >
                          Remove and replace front image
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-xs font-semibold text-blue-600 hover:underline">
                          Click to upload ID front photo
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          PNG, JPG, or PDF up to 5MB. Must be crisp and legible.
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={e => handleFileUpload(e, setIdFrontImage)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Upload Back Image (Optional for passport, required for license/national ID) */}
                {idType !== 'passport' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Back of Document (Optional / Recommended)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center transition-colors bg-slate-50/50">
                      {idBackImage ? (
                        <div className="space-y-2">
                          <img
                            src={idBackImage}
                            alt="ID Back Preview"
                            className="max-h-40 mx-auto rounded-lg border border-slate-200 object-contain shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setIdBackImage('')}
                            className="text-[11px] text-rose-600 hover:underline cursor-pointer font-medium"
                          >
                            Remove and replace back image
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <span className="text-xs font-semibold text-blue-600 hover:underline">
                            Click to upload ID back photo
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            PNG or JPG up to 5MB.
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleFileUpload(e, setIdBackImage)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    Continue to Biometric Verification
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Selfie Biometric Verification */}
            {step === 3 && (
              <form onSubmit={handleNextStep3} className="space-y-4">
                <div className="text-center max-w-md mx-auto space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Biometric Liveness Verification</h4>
                  <p className="text-xs text-slate-500">
                    Upload a clear, forward-facing portrait photo (selfie) holding your document or looking straight
                    into the camera in a well-lit environment.
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50 max-w-md mx-auto">
                  {selfieImage ? (
                    <div className="space-y-3">
                      <img
                        src={selfieImage}
                        alt="Selfie Biometric Preview"
                        className="w-40 h-40 object-cover rounded-full mx-auto border-4 border-white shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => setSelfieImage('')}
                        className="text-[11px] text-rose-600 hover:underline cursor-pointer font-medium"
                      >
                        Retake or re-upload photo
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Camera className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                      <span className="text-xs font-semibold text-blue-600 hover:underline">
                        Take or upload verification selfie
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Ensure face is fully visible without sunglasses, hats, or heavy filters.
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={e => handleFileUpload(e, setSelfieImage)}
                      />
                    </label>
                  )}
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    Proceed to Review
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Review & Legal Attestation */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
                  <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-2 flex items-center justify-between">
                    <span>Verification Summary</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-blue-600 hover:underline font-normal text-[11px] cursor-pointer"
                    >
                      Edit details
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Full Name</span>
                      <span className="font-semibold text-slate-800">{legalFirstName} {legalLastName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Date of Birth</span>
                      <span className="font-semibold text-slate-800">{dateOfBirth}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Country & Address</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {residentialAddress}, {city}, {country}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Document</span>
                      <span className="font-semibold text-slate-800 uppercase">
                        {idType.replace('_', ' ')}: {idNumber}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex items-center gap-3">
                    {idFrontImage && (
                      <div className="text-center">
                        <img
                          src={idFrontImage}
                          alt="Front"
                          className="w-16 h-12 object-cover rounded border border-slate-300"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">ID Front</span>
                      </div>
                    )}
                    {selfieImage && (
                      <div className="text-center">
                        <img
                          src={selfieImage}
                          alt="Selfie"
                          className="w-16 h-12 object-cover rounded border border-slate-300"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">Selfie</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Regulatory Attestation
                  </div>
                  <p className="text-[11px] text-slate-600">
                    By submitting, I certify under penalty of perjury that the information and identification provided
                    are genuine, true, and correct. I authorize X-FUNDS Clearing Corporation to verify these documents
                    with governmental databases in compliance with global anti-money laundering (AML) standards.
                  </p>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinalSubmit}
                    className="px-6 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Encrypting & Transmitting...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Confirm & Submit For Audit
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
