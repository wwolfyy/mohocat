"use client";

import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        data-oid="rbw6d6x"
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"
          data-oid="xuf08x3"
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-oid="xea-7_-">
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        data-oid="8kr1v6n"
      >
        <div className="mb-8" data-oid="x6__jvc">
          <h1 className="text-3xl font-bold text-gray-900" data-oid="8j8-ogt">
            🐱 Mountain Cats Admin
          </h1>
          <p className="text-gray-600 mt-2" data-oid="wmoxlp7">
            Admin Dashboard - Basic Implementation
          </p>
        </div>

        {/* Simple Stats Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          data-oid="5gvmt7."
        >
          <div
            className="bg-white p-6 rounded-lg shadow-sm border"
            data-oid="p0r_o.a"
          >
            <div
              className="flex items-center justify-between"
              data-oid="d.6jn0l"
            >
              <div data-oid="f6mjze3">
                <p
                  className="text-sm font-medium text-gray-600"
                  data-oid="k8_pu_p"
                >
                  Total Images
                </p>
                <p
                  className="text-3xl font-bold text-gray-900"
                  data-oid="kwp::kt"
                >
                  --
                </p>
              </div>
              <div className="text-2xl" data-oid="ib:n.8r">
                🖼️
              </div>
            </div>
          </div>

          <div
            className="bg-white p-6 rounded-lg shadow-sm border"
            data-oid="fz5:2lf"
          >
            <div
              className="flex items-center justify-between"
              data-oid="xxvbzmc"
            >
              <div data-oid="zj7b5vq">
                <p
                  className="text-sm font-medium text-gray-600"
                  data-oid="zudib3y"
                >
                  Total Videos
                </p>
                <p
                  className="text-3xl font-bold text-gray-900"
                  data-oid=":--ha44"
                >
                  --
                </p>
              </div>
              <div className="text-2xl" data-oid="9udoqzw">
                🎥
              </div>
            </div>
          </div>

          <div
            className="bg-white p-6 rounded-lg shadow-sm border border-yellow-200 bg-yellow-50"
            data-oid="d59avhl"
          >
            <div
              className="flex items-center justify-between"
              data-oid="e4y7yo8"
            >
              <div data-oid="0jk_qrb">
                <p
                  className="text-sm font-medium text-gray-600"
                  data-oid="4s4ffh4"
                >
                  Untagged Images
                </p>
                <p
                  className="text-3xl font-bold text-gray-900"
                  data-oid="c18_ayt"
                >
                  --
                </p>
              </div>
              <div className="text-2xl" data-oid="7p2jtoa">
                🏷️
              </div>
            </div>
          </div>

          <div
            className="bg-white p-6 rounded-lg shadow-sm border border-red-200 bg-red-50"
            data-oid="sdt1-sv"
          >
            <div
              className="flex items-center justify-between"
              data-oid=".0axlsw"
            >
              <div data-oid="oszp:tk">
                <p
                  className="text-sm font-medium text-gray-600"
                  data-oid="f5oa4rk"
                >
                  Untagged Videos
                </p>
                <p
                  className="text-3xl font-bold text-gray-900"
                  data-oid="qoe0rct"
                >
                  --
                </p>
              </div>
              <div className="text-2xl" data-oid="y:b91zo">
                📹
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="bg-white rounded-lg shadow-sm border p-6"
          data-oid="lxey6m8"
        >
          <h2
            className="text-xl font-semibold text-gray-900 mb-4"
            data-oid="hh.ydgt"
          >
            Quick Actions
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-oid="7lh62a:"
          >
            <a
              href="/admin/tag-images"
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
              data-oid="p.v60f2"
            >
              <div className="flex items-start space-x-3" data-oid="xjvasgo">
                <div className="text-xl" data-oid="2oyeqlb">
                  🖼️
                </div>
                <div data-oid="mcpode_">
                  <h3 className="font-medium text-gray-900" data-oid="x14k8a2">
                    Tag Images
                  </h3>
                  <p className="text-sm text-gray-600 mt-1" data-oid="bu.g9_x">
                    Tag untagged images with cat names
                  </p>
                </div>
              </div>
            </a>

            <a
              href="/admin/tag-videos"
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
              data-oid="y.qsxeo"
            >
              <div className="flex items-start space-x-3" data-oid="f6b36_3">
                <div className="text-xl" data-oid="fmjo8lj">
                  🎥
                </div>
                <div data-oid="dd6.tdx">
                  <h3 className="font-medium text-gray-900" data-oid="ni8u3ll">
                    Tag Videos
                  </h3>
                  <p className="text-sm text-gray-600 mt-1" data-oid="2z:n:-z">
                    Tag untagged videos with cat names
                  </p>
                </div>
              </div>
            </a>

            <a
              href="/admin/cats"
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
              data-oid="5xcg87h"
            >
              <div className="flex items-start space-x-3" data-oid="4zkhuos">
                <div className="text-xl" data-oid="p43k5t1">
                  🐱
                </div>
                <div data-oid="h3mft79">
                  <h3 className="font-medium text-gray-900" data-oid="8wyt4n:">
                    Manage Cats
                  </h3>
                  <p className="text-sm text-gray-600 mt-1" data-oid="oyof9l4">
                    Add, edit, or remove cat profiles
                  </p>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center" data-oid="ju0453z">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-500"
            data-oid="7gb67eo"
          >
            ← Back to Main Site
          </a>
        </div>
      </div>
    </div>
  );
}
