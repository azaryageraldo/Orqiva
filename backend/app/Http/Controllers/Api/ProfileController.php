<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show()
    {
        return response()->json([
            'user' => request()->user(),
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'password' => ['nullable', 'string', 'min:8'],
            'current_password' => [
                'nullable',
                'required_with:password',
                'string',
                function ($attribute, $value, $fail) use ($user) {
                    if ($value !== null && ! Hash::check($value, $user->password)) {
                        $fail('Password saat ini tidak benar.');
                    }
                },
            ],
        ]);

        $user->name = $data['name'];
        $user->email = $data['email'];
        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();

        return response()->json([
            'user' => $user->fresh(),
        ]);
    }
}