import React from 'react';
import { Award, Users, Clock } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Skills Matrix - Competence Verification
// ISO 9001:2015 Clause 7.2

export default function SkillsMatrixPage(): JSX.Element {
  return (
    <AppShell>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Skills Matrix</h1>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 7.2 - Competence verification and monitoring
            </p>
          </div>
        </div>

        {/* ISO Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Clause 7.2 Compliance
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Skills matrix tracks required vs actual competence levels per role.
                Verification methods: Training, Assessment, Experience, Audit.
                Employees must demonstrate competence before independent work authorization.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100+</div>
              <p className="text-xs text-muted-foreground">Data annotators & QC</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Training Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">F/28</div>
              <p className="text-xs text-muted-foreground">Form reference</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Post-Training</div>
              <p className="text-xs text-muted-foreground">Assessment required</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Authorization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">HOD</div>
              <p className="text-xs text-muted-foreground">Approval authority</p>
            </CardContent>
          </Card>
        </div>

        {/* Skills Tracking Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Competence Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Identify competence requirements per role (Job Description)</li>
                <li>Provide training via F/28 Training Program</li>
                <li>Assess competence post-training</li>
                <li>Verify practical application</li>
                <li>Authorize independent work (HOD sign-off)</li>
                <li>Monitor ongoing performance</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Key Competencies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {[
                  'Image Annotation Accuracy',
                  'Text Classification',
                  'Audio Transcription',
                  'Quality Control Procedures',
                  'ISO 9001:2015 Awareness',
                  'Data Security & GDPR',
                ].map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{skill}</span>
                    <span className="text-xs text-muted-foreground">Required</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reference Section */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Monitoring & Review
          </h4>          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Review Frequency:</span>
              <div>Annual (minimum)</div>
            </div>            <div>
              <span className="text-muted-foreground">Trigger Events:</span>
              <div>Role change, error trend, procedure update</div>
            </div>            <div>
              <span className="text-muted-foreground">Records Maintained:</span>
              <div>F/28 + Skills Matrix (this page)</div>
            </div>          </div>        </div>      </div>
    </AppShell>
  );
}
